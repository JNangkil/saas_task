<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RealtimeController extends Controller
{
    /**
     * Check realtime availability status for the tenant.
     * 
     * @param Request $request
     * @param Tenant $tenant
     * @return JsonResponse
     */
    public function status(Request $request, Tenant $tenant): JsonResponse
    {
        // Check if user is member of tenant (middleware likely handles this, but good to ensure)
        if (!$tenant->users()->where('users.id', $request->user()->id)->exists()) {
            abort(403, 'Unauthorized access to tenant.');
        }

        $isEnabled = $tenant->isRealtimeEnabled();
        
        return response()->json([
            'enabled' => $isEnabled,
            'details' => [
                'system_enabled' => config('app.realtime_enabled', false),
                'tenant_setting' => $tenant->settings['realtime_enabled'] ?? null,
                'has_subscription' => $tenant->hasActiveSubscription(),
                'feature_available' => $tenant->canUseFeature('realtime'),
            ]
        ]);
    }
}
