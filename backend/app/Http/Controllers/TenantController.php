<?php

namespace App\Http\Controllers;

use App\Http\Requests\TenantRequest;
use App\Http\Resources\TenantResource;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TenantController extends Controller
{
    /**
     * Display a listing of the user's tenants.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $tenants = $user->tenants()->with(['workspaces' => function ($query) {
            $query->where('is_archived', false);
        }])->paginate($request->get('per_page', 15));

        return TenantResource::collection($tenants);
    }

    /**
     * Store a newly created tenant in storage.
     */
    public function store(TenantRequest $request): JsonResponse
    {
        $user = Auth::user();
        
        return DB::transaction(function () use ($request, $user) {
            $tenant = Tenant::create($request->validated());
            
            // Attach the creating user as owner
            $tenant->users()->attach($user->id, [
                'role' => 'owner',
                'joined_at' => now(),
            ]);

            // Create a default workspace
            $workspace = Workspace::create([
                'tenant_id' => $tenant->id,
                'name' => 'General',
                'description' => 'Default workspace for the tenant',
                'color' => '#3B82F6',
                'icon' => '🏢',
                'is_default' => true,
            ]);

            // Add the user to the default workspace as admin
            $workspace->users()->attach($user->id, [
                'role' => 'admin',
                'joined_at' => now(),
            ]);

            return (new TenantResource($tenant->load('workspaces')))
                ->response()
                ->setStatusCode(201);
        });
    }

    /**
     * Display the specified tenant.
     */
    public function show(Tenant $tenant): JsonResponse
    {
        $this->authorize('view', $tenant);
        
        $tenant->load(['workspaces' => function ($query) {
            $query->withCount('users');
        }, 'users' => function ($query) {
            $query->select('users.id', 'name', 'email', 'tenant_user.role', 'tenant_user.joined_at');
        }]);

        return new TenantResource($tenant);
    }

    /**
     * Update the specified tenant in storage.
     */
    public function update(TenantRequest $request, Tenant $tenant): JsonResponse
    {
        $this->authorize('update', $tenant);
        
        $tenant->update($request->validated());
        
        return new TenantResource($tenant->load('workspaces'));
    }

    /**
     * Archive/deactivate the specified tenant.
     */
    public function archive(Tenant $tenant): JsonResponse
    {
        $this->authorize('archive', $tenant);
        
        $tenant->update(['status' => 'deactivated']);
        
        return response()->json([
            'message' => 'Tenant deactivated successfully',
        ]);
    }

    /**
     * Reactivate the specified tenant.
     */
    public function reactivate(Tenant $tenant): JsonResponse
    {
        $this->authorize('reactivate', $tenant);
        
        $tenant->update(['status' => 'active']);
        
        return response()->json([
            'message' => 'Tenant reactivated successfully',
        ]);
    }

    /**
     * Remove the specified tenant from storage.
     */
    public function destroy(Tenant $tenant): JsonResponse
    {
        $this->authorize('delete', $tenant);
        
        $tenant->delete();
        
        return response()->json([
            'message' => 'Tenant deleted successfully',
        ]);
    }

    /**
     * Get tenant members.
     */
    public function members(Tenant $tenant): JsonResponse
    {
        $this->authorize('manageUsers', $tenant);
        
        $members = $tenant->users()->select(
            'users.id',
            'users.name',
            'users.email',
            'tenant_user.role',
            'tenant_user.joined_at',
            'tenant_user.invited_at'
        )->paginate(15);

        return response()->json($members);
    }

    /**
     * Add a member to the tenant.
     */
    public function addMember(Request $request, Tenant $tenant): JsonResponse
    {
        $this->authorize('manageUsers', $tenant);
        
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'role' => 'required|in:owner,admin,member',
        ]);

        $user = User::where('email', $validated['email'])->first();
        
        if ($tenant->users()->where('users.id', $user->id)->exists()) {
            return response()->json([
                'message' => 'User is already a member of this tenant',
            ], 422);
        }

        $tenant->users()->attach($user->id, [
            'role' => $validated['role'],
            'invited_at' => now(),
            'joined_at' => now(),
        ]);

        return response()->json([
            'message' => 'Member added successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $validated['role'],
            ],
        ]);
    }

    /**
     * Update a member's role in the tenant.
     */
    public function updateMemberRole(Request $request, Tenant $tenant, User $user): JsonResponse
    {
        $this->authorize('manageUsers', $tenant);
        
        $validated = $request->validate([
            'role' => 'required|in:owner,admin,member',
        ]);

        $tenant->users()->updateExistingPivot($user->id, [
            'role' => $validated['role'],
        ]);

        return response()->json([
            'message' => 'Member role updated successfully',
        ]);
    }

    /**
     * Remove a member from the tenant.
     */
    public function removeMember(Tenant $tenant, User $user): JsonResponse
    {
        $this->authorize('manageUsers', $tenant);
        
        // Don't allow removing the owner
        if ($tenant->getUserRole($user) === 'owner') {
            return response()->json([
                'message' => 'Cannot remove the tenant owner',
            ], 422);
        }

        $tenant->users()->detach($user->id);

        return response()->json([
            'message' => 'Member removed successfully',
        ]);
    }

    /**
     * Get tenant settings.
     */
    public function settings(Tenant $tenant): JsonResponse
    {
        $this->authorize('manageSettings', $tenant);
        
        return response()->json([
            'settings' => $tenant->settings,
        ]);
    }

    /**
     * Update tenant settings.
     */
    public function updateSettings(Request $request, Tenant $tenant): JsonResponse
    {
        $this->authorize('manageSettings', $tenant);
        
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.theme' => 'sometimes|string|in:light,dark',
            'settings.timezone' => 'sometimes|string|timezone',
            'settings.locale' => 'sometimes|string|max:10',
        ]);

        $tenant->update([
            'settings' => array_merge($tenant->settings ?? [], $validated['settings']),
        ]);

        return response()->json([
            'message' => 'Settings updated successfully',
            'settings' => $tenant->fresh()->settings,
        ]);
    }
}