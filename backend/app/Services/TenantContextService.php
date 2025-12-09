<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class TenantContextService
{
    /**
     * Get the current tenant instance.
     */
    public function getCurrentTenant(): ?Tenant
    {
        return app('current_tenant');
    }

    /**
     * Get the current tenant ID.
     */
    public function getCurrentTenantId(): ?int
    {
        $tenant = $this->getCurrentTenant();
        return $tenant ? $tenant->id : null;
    }

    /**
     * Check if there is a current tenant context.
     */
    public function hasCurrentTenant(): bool
    {
        return $this->getCurrentTenant() !== null;
    }

    /**
     * Get the current tenant or throw an exception if none exists.
     */
    public function requireCurrentTenant(): Tenant
    {
        $tenant = $this->getCurrentTenant();
        if (!$tenant) {
            throw new \Exception('Tenant context is required but not available');
        }
        return $tenant;
    }

    /**
     * Set the tenant context for the current request.
     */
    public function setCurrentTenant(Tenant $tenant): void
    {
        app()->instance('current_tenant', $tenant);
    }

    /**
     * Clear the tenant context for the current request.
     */
    public function clearCurrentTenant(): void
    {
        app()->instance('current_tenant', null);
    }

    /**
     * Execute a callback within a specific tenant context.
     */
    public function withTenant(Tenant $tenant, callable $callback)
    {
        $originalTenant = $this->getCurrentTenant();
        $this->setCurrentTenant($tenant);
        
        try {
            return $callback();
        } finally {
            if ($originalTenant) {
                $this->setCurrentTenant($originalTenant);
            } else {
                $this->clearCurrentTenant();
            }
        }
    }

    /**
     * Execute a callback without tenant scoping.
     * Useful for system operations that need to access all data.
     */
    public function withoutTenantScope(callable $callback)
    {
        $originalTenant = $this->getCurrentTenant();
        $this->clearCurrentTenant();
        
        try {
            return $callback();
        } finally {
            if ($originalTenant) {
                $this->setCurrentTenant($originalTenant);
            }
        }
    }

    /**
     * Get the current user's role in the current tenant.
     */
    public function getCurrentUserRole(): ?string
    {
        if (!Auth::check() || !$this->hasCurrentTenant()) {
            return null;
        }
        
        return $this->getCurrentTenant()->getUserRole(Auth::user());
    }

    /**
     * Check if the current user can perform an action in the current tenant.
     */
    public function currentUserCan(string $action): bool
    {
        if (!Auth::check() || !$this->hasCurrentTenant()) {
            return false;
        }

        $user = Auth::user();
        $tenant = $this->getCurrentTenant();
        $role = $tenant->getUserRole($user);

        switch ($action) {
            case 'manage':
                return in_array($role, ['owner', 'admin']);
            case 'create_workspaces':
                return in_array($role, ['owner', 'admin', 'member']);
            case 'view':
                return in_array($role, ['owner', 'admin', 'member', 'viewer']);
            default:
                return false;
        }
    }

    /**
     * Check if the current tenant is active.
     */
    public function isCurrentTenantActive(): bool
    {
        return $this->getCurrentTenant()?->isActive() ?? false;
    }

    /**
     * Check if the current tenant has an active subscription.
     */
    public function doesCurrentTenantHaveSubscription(): bool
    {
        return $this->getCurrentTenant()?->hasActiveSubscription() ?? false;
    }

    /**
     * Check if the current tenant can use a specific feature.
     */
    public function canCurrentTenantUseFeature(string $feature): bool
    {
        return $this->getCurrentTenant()?->canUseFeature($feature) ?? false;
    }

    /**
     * Get the current tenant's plan limits.
     */
    public function getCurrentTenantPlanLimits(): array
    {
        return $this->getCurrentTenant()?->getPlanLimits() ?? [];
    }

    /**
     * Get all tenants for the current user.
     */
    public function getUserTenants(): array
    {
        if (!Auth::check()) {
            return [];
        }

        $user = Auth::user();
        $currentTenant = $this->getCurrentTenant();

        return $user->tenants()->get()->map(function ($tenant) use ($user, $currentTenant) {
            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'role' => $tenant->getUserRole($user),
                'is_current' => $currentTenant && $currentTenant->id === $tenant->id,
                'is_active' => $tenant->isActive(),
                'subscription_status' => $tenant->getSubscriptionStatus(),
            ];
        })->toArray();
    }

    /**
     * Switch the current user to a different tenant.
     */
    public function switchToTenant(int $tenantId): ?Tenant
    {
        if (!Auth::check()) {
            return null;
        }

        $user = Auth::user();
        $tenant = $user->tenants()->where('tenants.id', $tenantId)->first();
        
        if (!$tenant) {
            return null;
        }

        $this->setCurrentTenant($tenant);
        return $tenant;
    }

    /**
     * Validate that the current user has access to the current tenant.
     */
    public function validateCurrentUserAccess(): bool
    {
        if (!Auth::check() || !$this->hasCurrentTenant()) {
            return false;
        }

        $user = Auth::user();
        $tenant = $this->getCurrentTenant();

        // Super admins can access any tenant
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Check if user belongs to the tenant
        return $tenant->users()->where('users.id', $user->id)->exists();
    }

    /**
     * Get the default tenant for the current user.
     */
    public function getUserDefaultTenant(): ?Tenant
    {
        if (!Auth::check()) {
            return null;
        }

        $user = Auth::user();
        
        // Try to get the user's first tenant as default
        return $user->tenants()->first();
    }

    /**
     * Initialize tenant context from JWT token.
     */
    public function initializeFromJwtToken(array $payload): ?Tenant
    {
        if (!isset($payload['tenant_id'])) {
            return null;
        }

        $tenant = Tenant::find($payload['tenant_id']);
        
        if ($tenant) {
            $this->setCurrentTenant($tenant);
        }

        return $tenant;
    }
}