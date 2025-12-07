<?php

namespace App\Policies;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class TenantPolicy
{
    /**
     * Determine whether the user can view any tenants.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the tenant.
     */
    public function view(User $user, Tenant $tenant): bool
    {
        return $tenant->users()->where('users.id', $user->id)->exists();
    }

    /**
     * Determine whether the user can create tenants.
     */
    public function create(User $user): bool
    {
        // For now, allow any authenticated user to create a tenant
        // In a real application, you might want to restrict this
        return true;
    }

    /**
     * Determine whether the user can update the tenant.
     */
    public function update(User $user, Tenant $tenant): bool
    {
        return $tenant->canUserManage($user);
    }

    /**
     * Determine whether the user can delete the tenant.
     */
    public function delete(User $user, Tenant $tenant): bool
    {
        return $tenant->hasUserRole($user, 'owner');
    }

    /**
     * Determine whether the user can manage tenant users.
     */
    public function manageUsers(User $user, Tenant $tenant): bool
    {
        return $tenant->canUserManage($user);
    }

    /**
     * Determine whether the user can manage tenant settings.
     */
    public function manageSettings(User $user, Tenant $tenant): bool
    {
        return $tenant->canUserManage($user);
    }

    /**
     * Determine whether the user can archive/deactivate the tenant.
     */
    public function archive(User $user, Tenant $tenant): bool
    {
        return $tenant->hasUserRole($user, 'owner');
    }

    /**
     * Determine whether the user can reactivate the tenant.
     */
    public function reactivate(User $user, Tenant $tenant): bool
    {
        return $tenant->hasUserRole($user, 'owner');
    }

    /**
     * Determine whether the user can manage tenant billing.
     */
    public function manageBilling(User $user, Tenant $tenant): bool
    {
        return $tenant->hasUserRole($user, 'owner');
    }

    /**
     * Determine whether the user can create workspaces in the tenant.
     */
    public function createWorkspaces(User $user, Tenant $tenant): bool
    {
        return $tenant->canUserManage($user);
    }

    /**
     * Determine whether the user can view tenant analytics.
     */
    public function viewAnalytics(User $user, Tenant $tenant): bool
    {
        return $tenant->canUserManage($user);
    }
}