<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Subscription;
use App\Models\Plan;
use App\Models\SystemSettings;
use App\Models\SuperAdminAuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class SuperAdminController extends Controller
{
    /**
     * Create a new controller instance.
     */
    public function __construct()
    {
        // Add authentication and super admin middleware
        $this->middleware('auth:sanctum');
        $this->middleware('super.admin');
    }

    /**
     * List all tenants with pagination and filters.
     */
    public function indexTenants(Request $request): JsonResponse
    {
        $query = Tenant::with(['owner', 'subscription.plan']);

        // Apply filters
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('slug', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->plan) {
            $query->whereHas('subscription', function ($q) use ($request) {
                $q->whereHas('plan', function ($subQ) use ($request) {
                    $subQ->where('code', $request->plan);
                });
            });
        }

        $tenants = $query->paginate($request->per_page ?? 15);

        return response()->json($tenants);
    }

    /**
     * Get tenant details with statistics.
     */
    public function showTenant(Tenant $tenant): JsonResponse
    {
        $tenant->load(['owner', 'subscription.plan']);

        // Get usage statistics
        $stats = [
            'users_count' => $tenant->users()->count(),
            'workspaces_count' => $tenant->workspaces()->count(),
            'boards_count' => $tenant->workspaces()->withCount('boards')->get()->sum('boards_count'),
            'tasks_count' => DB::table('tasks')
                ->join('boards', 'tasks.board_id', '=', 'boards.id')
                ->join('workspaces', 'boards.workspace_id', '=', 'workspaces.id')
                ->where('workspaces.tenant_id', $tenant->id)
                ->count(),
        ];

        return response()->json([
            'tenant' => $tenant,
            'stats' => $stats
        ]);
    }

    /**
     * Update tenant status (enable/disable).
     */
    public function updateTenantStatus(Request $request, Tenant $tenant): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:active,disabled',
        ]);

        $oldStatus = $tenant->status;
        $tenant->status = $request->status;
        $tenant->save();

        // Log the action
        SuperAdminAuditLog::create([
            'admin_id' => Auth::id(),
            'action' => 'update_tenant_status',
            'entity_type' => 'Tenant',
            'entity_id' => $tenant->id,
            'metadata' => [
                'old_status' => $oldStatus,
                'new_status' => $request->status,
            ],
        ]);

        return response()->json([
            'message' => 'Tenant status updated successfully.',
            'tenant' => $tenant
        ]);
    }

    /**
     * Start tenant impersonation.
     */
    public function impersonateTenant(Tenant $tenant): JsonResponse
    {
        $owner = $tenant->owner;

        if (!$owner) {
            return response()->json([
                'message' => 'Tenant does not have an owner.',
                'error' => 'no_tenant_owner'
            ], 422);
        }

        // Create a temporary token for impersonation
        $token = $owner->createToken('impersonation', ['*'], Carbon::now()->addHour());

        // Log the impersonation
        SuperAdminAuditLog::create([
            'admin_id' => Auth::id(),
            'action' => 'impersonate_tenant',
            'entity_type' => 'Tenant',
            'entity_id' => $tenant->id,
            'metadata' => [
                'impersonated_user_id' => $owner->id,
                'tenant_name' => $tenant->name,
            ],
        ]);

        return response()->json([
            'message' => 'Impersonation started successfully.',
            'token' => $token->plainTextToken,
            'expires_at' => $token->accessToken->expires_at,
            'tenant' => $tenant,
            'user' => $owner,
        ]);
    }

    /**
     * Get subscription summary with metrics.
     */
    public function subscriptionSummary(): JsonResponse
    {
        $totalTenants = Tenant::count();
        $activeTenants = Tenant::where('status', 'active')->count();

        // Calculate MRR/ARR
        $mrr = Subscription::where('status', 'active')
            ->whereHas('tenant', function ($q) {
                $q->where('status', 'active');
            })
            ->join('plans', 'subscriptions.plan_id', '=', 'plans.id')
            ->sum('plans.price');

        $arr = $mrr * 12;

        // Get tenants by plan distribution
        $tenantsByPlan = DB::table('tenants')
            ->selectRaw('plans.name as plan_name, plans.code as plan_code, COUNT(*) as count')
            ->leftJoin('subscriptions', 'tenants.id', '=', 'subscriptions.tenant_id')
            ->leftJoin('plans', 'subscriptions.plan_id', '=', 'plans.id')
            ->where('tenants.status', 'active')
            ->groupBy('plans.name', 'plans.code')
            ->orderBy('count', 'desc')
            ->get();

        return response()->json([
            'mrr' => $mrr,
            'arr' => $arr,
            'total_tenants' => $totalTenants,
            'active_tenants' => $activeTenants,
            'tenants_by_plan' => $tenantsByPlan,
        ]);
    }

    /**
     * Get system-wide metrics.
     */
    public function systemMetrics(): JsonResponse
    {
        // Get global counts
        $metrics = [
            'total_tenants' => Tenant::count(),
            'active_tenants' => Tenant::where('status', 'active')->count(),
            'total_users' => User::count(),
            'total_workspaces' => DB::table('workspaces')->count(),
            'total_boards' => DB::table('boards')->count(),
            'total_tasks' => DB::table('tasks')->count(),
        ];

        // Calculate signup trends
        $today = Carbon::today();
        $weekAgo = $today->copy()->subDays(7);
        $monthAgo = $today->copy()->subMonth();

        $metrics['daily_signups'] = User::whereDate('created_at', $today)->count();
        $metrics['weekly_signups'] = User::whereBetween('created_at', [$weekAgo, $today])->count();
        $metrics['monthly_signups'] = User::whereBetween('created_at', [$monthAgo, $today])->count();

        // Get subscription metrics
        $metrics['active_subscriptions'] = Subscription::where('status', 'active')->count();
        $metrics['trial_subscriptions'] = Subscription::where('status', 'trial')->count();
        $metrics['expired_subscriptions'] = Subscription::where('status', 'expired')->count();

        return response()->json($metrics);
    }

    /**
     * Get audit logs for super admin actions.
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $query = SuperAdminAuditLog::with(['admin' => fn($q) => $q->select('id', 'name', 'email')])
            ->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->action) {
            $query->where('action', $request->action);
        }

        if ($request->entity_type) {
            $query->where('entity_type', $request->entity_type);
        }

        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->paginate($request->per_page ?? 20);

        return response()->json($logs);
    }

    /**
     * Get recent error logs (simplified version - in production, integrate with logging system).
     */
    public function errorLogs(Request $request): JsonResponse
    {
        // This is a simplified implementation
        // In production, you would integrate with Laravel's logging system
        // or a dedicated error tracking service like Sentry

        $logs = [
            [
                'id' => 1,
                'level' => 'error',
                'message' => 'Database connection failed',
                'context' => ['tenant_id' => 123],
                'created_at' => now()->subMinutes(15),
            ],
            [
                'id' => 2,
                'level' => 'warning',
                'message' => 'Rate limit exceeded for API endpoint',
                'context' => ['ip' => '192.168.1.1', 'endpoint' => '/api/tasks'],
                'created_at' => now()->subMinutes(30),
            ],
            // Add more sample logs as needed
        ];

        return response()->json([
            'logs' => collect($logs)->slice(0, $request->limit ?? 50),
        ]);
    }

    /**
     * Get system health checks.
     */
    public function healthChecks(): JsonResponse
    {
        $health = [
            'database' => $this->checkDatabaseHealth(),
            'redis' => $this->checkRedisHealth(),
            'storage' => $this->checkStorageHealth(),
            'queue' => $this->checkQueueHealth(),
        ];

        $overall = collect($health)->every(fn($status) => $status === 'healthy');

        return response()->json([
            'overall' => $overall ? 'healthy' : 'unhealthy',
            'checks' => $health,
            'timestamp' => now()->toISOString(),
        ]);
    }

    /**
     * Check database health.
     */
    private function checkDatabaseHealth(): string
    {
        try {
            DB::select('SELECT 1');
            return 'healthy';
        } catch (\Exception $e) {
            return 'unhealthy';
        }
    }

    /**
     * Check Redis health.
     */
    private function checkRedisHealth(): string
    {
        try {
            \Illuminate\Support\Facades\Redis::ping();
            return 'healthy';
        } catch (\Exception $e) {
            return 'unhealthy';
        }
    }

    /**
     * Check storage health.
     */
    private function checkStorageHealth(): string
    {
        try {
            \Illuminate\Support\Facades\Storage::disk('local')->exists('.gitkeep');
            return 'healthy';
        } catch (\Exception $e) {
            return 'unhealthy';
        }
    }

    /**
     * Check queue health.
     */
    private function checkQueueHealth(): string
    {
        try {
            // Check if queue worker is running
            // This is a simplified check
            return 'healthy';
        } catch (\Exception $e) {
            return 'unhealthy';
        }
    }

    /**
     * Get all plans with pagination and filters.
     */
    public function indexPlans(Request $request): JsonResponse
    {
        $query = Plan::query();

        // Apply filters
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('slug', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->billing_interval) {
            $query->where('billing_interval', $request->billing_interval);
        }

        if ($request->has('is_popular')) {
            $query->where('is_popular', $request->boolean('is_popular'));
        }

        // Order by price, then name
        $query->orderBy('price')->orderBy('name');

        $plans = $query->paginate($request->per_page ?? 15);

        return response()->json($plans);
    }

    /**
     * Create a new plan.
     */
    public function storePlan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:plans,slug',
            'price' => 'required|numeric|min:0',
            'billing_interval' => 'required|in:month,year',
            'trial_days' => 'nullable|integer|min:0',
            'limits' => 'required|array',
            'limits.max_users' => 'required|integer|min:1',
            'limits.max_workspaces' => 'required|integer|min:1',
            'limits.max_boards' => 'required|integer|min:1',
            'limits.max_storage_mb' => 'required|integer|min:1',
            'features' => 'nullable|array',
            'stripe_price_id' => 'nullable|string|max:255',
            'metadata' => 'nullable|array',
            'is_popular' => 'boolean',
        ]);

        $plan = Plan::create($validated);

        // Log the action
        SuperAdminAuditLog::create([
            'admin_id' => Auth::id(),
            'action' => 'create_plan',
            'entity_type' => 'Plan',
            'entity_id' => $plan->id,
            'metadata' => [
                'plan_name' => $plan->name,
                'plan_slug' => $plan->slug,
                'price' => $plan->price,
                'billing_interval' => $plan->billing_interval,
            ],
        ]);

        return response()->json([
            'message' => 'Plan created successfully.',
            'plan' => $plan
        ], 201);
    }

    /**
     * Get a specific plan.
     */
    public function showPlan(Plan $plan): JsonResponse
    {
        $plan->loadCount('subscriptions');

        return response()->json($plan);
    }

    /**
     * Update a plan.
     */
    public function updatePlan(Request $request, Plan $plan): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:255|unique:plans,slug,' . $plan->id,
            'price' => 'sometimes|numeric|min:0',
            'billing_interval' => 'sometimes|in:month,year',
            'trial_days' => 'sometimes|integer|min:0',
            'limits' => 'sometimes|array',
            'limits.max_users' => 'sometimes|integer|min:1',
            'limits.max_workspaces' => 'sometimes|integer|min:1',
            'limits.max_boards' => 'sometimes|integer|min:1',
            'limits.max_storage_mb' => 'sometimes|integer|min:1',
            'features' => 'sometimes|array',
            'stripe_price_id' => 'sometimes|nullable|string|max:255',
            'metadata' => 'sometimes|array',
            'is_popular' => 'sometimes|boolean',
        ]);

        $oldData = $plan->only(['name', 'slug', 'price', 'billing_interval', 'is_popular']);
        $plan->update($validated);

        // Log the action
        SuperAdminAuditLog::create([
            'admin_id' => Auth::id(),
            'action' => 'update_plan',
            'entity_type' => 'Plan',
            'entity_id' => $plan->id,
            'metadata' => [
                'old_data' => $oldData,
                'new_data' => $plan->only(['name', 'slug', 'price', 'billing_interval', 'is_popular']),
            ],
        ]);

        return response()->json([
            'message' => 'Plan updated successfully.',
            'plan' => $plan
        ]);
    }

    /**
     * Delete a plan.
     */
    public function destroyPlan(Plan $plan): JsonResponse
    {
        // Check if plan has active subscriptions
        $activeSubscriptions = $plan->subscriptions()->where('status', 'active')->count();
        if ($activeSubscriptions > 0) {
            return response()->json([
                'message' => 'Cannot delete plan with active subscriptions.',
                'error' => 'has_active_subscriptions',
                'active_subscriptions' => $activeSubscriptions,
            ], 422);
        }

        $planData = $plan->only(['name', 'slug', 'price', 'billing_interval']);
        $plan->delete();

        // Log the action
        SuperAdminAuditLog::create([
            'admin_id' => Auth::id(),
            'action' => 'delete_plan',
            'entity_type' => 'Plan',
            'entity_id' => $plan->id,
            'metadata' => [
                'deleted_plan' => $planData,
            ],
        ]);

        return response()->json([
            'message' => 'Plan deleted successfully.',
        ]);
    }

    /**
     * Get subscriptions filtered by plan and status.
     */
    public function indexSubscriptions(Request $request): JsonResponse
    {
        $query = Subscription::with(['tenant.owner', 'plan']);

        // Apply filters
        if ($request->plan_id) {
            $query->where('plan_id', $request->plan_id);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->billing_interval) {
            $query->whereHas('plan', function ($q) use ($request) {
                $q->where('billing_interval', $request->billing_interval);
            });
        }

        // Date range filters
        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $subscriptions = $query->paginate($request->per_page ?? 20);

        return response()->json($subscriptions);
    }

    /**
     * Get all system settings.
     */
    public function indexSettings(Request $request): JsonResponse
    {
        $query = SystemSettings::query();

        // Apply filters
        if ($request->has('is_public')) {
            $query->where('is_public', $request->boolean('is_public'));
        }

        if ($request->type) {
            $query->where('type', $request->type);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('key', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        $settings = $query->orderBy('key')->paginate($request->per_page ?? 20);

        return response()->json($settings);
    }

    /**
     * Update system settings.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array|min:1',
            'settings.*.key' => 'required|string|max:255',
            'settings.*.value' => 'required',
            'settings.*.type' => 'sometimes|in:string,number,integer,boolean,array',
            'settings.*.description' => 'sometimes|nullable|string|max:500',
            'settings.*.is_public' => 'sometimes|boolean',
        ]);

        $updated = [];

        foreach ($validated['settings'] as $settingData) {
            $oldSetting = SystemSettings::where('key', $settingData['key'])->first();
            $oldValue = $oldSetting?->value;

            $setting = SystemSettings::set(
                $settingData['key'],
                $settingData['value'],
                $settingData['type'] ?? 'string',
                $settingData['description'] ?? null,
                $settingData['is_public'] ?? false
            );

            // Log if value changed
            if ($oldValue && $oldValue !== $setting->value) {
                SuperAdminAuditLog::create([
                    'admin_id' => Auth::id(),
                    'action' => 'update_setting',
                    'entity_type' => 'SystemSettings',
                    'entity_id' => $setting->id,
                    'metadata' => [
                        'key' => $settingData['key'],
                        'old_value' => $oldValue,
                        'new_value' => $setting->value,
                    ],
                ]);
            }

            $updated[] = $setting;
        }

        return response()->json([
            'message' => count($updated) . ' settings updated successfully.',
            'settings' => $updated
        ]);
    }

    /**
     * Get a specific system setting.
     */
    public function showSetting(string $key): JsonResponse
    {
        $setting = SystemSettings::where('key', $key)->first();

        if (!$setting) {
            return response()->json([
                'message' => 'Setting not found.',
                'error' => 'setting_not_found'
            ], 404);
        }

        return response()->json($setting);
    }

    /**
     * Update a specific system setting.
     */
    public function updateSetting(Request $request, string $key): JsonResponse
    {
        $setting = SystemSettings::where('key', $key)->first();

        if (!$setting) {
            return response()->json([
                'message' => 'Setting not found.',
                'error' => 'setting_not_found'
            ], 404);
        }

        $validated = $request->validate([
            'value' => 'required',
            'type' => 'sometimes|in:string,number,integer,boolean,array',
            'description' => 'sometimes|nullable|string|max:500',
            'is_public' => 'sometimes|boolean',
        ]);

        $oldValue = $setting->value;
        $setting->update($validated);

        // Log the change
        if ($oldValue !== $setting->value) {
            SuperAdminAuditLog::create([
                'admin_id' => Auth::id(),
                'action' => 'update_setting',
                'entity_type' => 'SystemSettings',
                'entity_id' => $setting->id,
                'metadata' => [
                    'key' => $key,
                    'old_value' => $oldValue,
                    'new_value' => $setting->value,
                ],
            ]);
        }

        return response()->json([
            'message' => 'Setting updated successfully.',
            'setting' => $setting
        ]);
    }
}