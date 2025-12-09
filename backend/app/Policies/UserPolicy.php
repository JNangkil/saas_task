<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Tenant;
use Illuminate\Auth\Access\Response;

class UserPolicy
{
    /**
     * Determine whether the user can view any users in the tenant.
     */
    public function viewAny(User $user): bool
    {
        // Users can view other users if they can manage tenant users
        return false; // This will be checked via tenant policy
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        // Users can view their own profile
        if ($user->id === $model->id) {
            return true;
        }

        // Users can view others if they share a tenant
        return $user->tenants()->whereIn('tenants.id', $model->tenants()->pluck('tenants.id'))->exists();
    }

    /**
     * Determine whether the user can manage users in a tenant.
     */
    public function manageUsers(User $user, Tenant $tenant): bool
    {
        // Super admins can manage all users
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Users with owner or admin role in tenant can manage users
        $role = $user->getTenantRole($tenant);
        return in_array($role, ['owner', 'admin']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        // Users can update their own profile
        if ($user->id === $model->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can update the user's role in tenant.
     */
    public function updateTenantRole(User $user, User $model, Tenant $tenant): bool
    {
        // Can't change your own role
        if ($user->id === $model->id) {
            return false;
        }

        // Super admins can change any role
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Only owners and admins can change roles
        $role = $user->getTenantRole($tenant);
        if (!in_array($role, ['owner', 'admin'])) {
            return false;
        }

        // Only owners can make other owners
        $newRole = request('role');
        if ($newRole === 'owner' && $role !== 'owner') {
            return false;
        }

        // Can't change the role of the tenant owner unless you're the owner
        $targetRole = $model->getTenantRole($tenant);
        if ($targetRole === 'owner' && $role !== 'owner') {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can remove a user from tenant.
     */
    public function removeFromTenant(User $user, User $model, Tenant $tenant): bool
    {
        // Can't remove yourself
        if ($user->id === $model->id) {
            return false;
        }

        // Super admins can remove anyone
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Only owners and admins can remove users
        $role = $user->getTenantRole($tenant);
        if (!in_array($role, ['owner', 'admin'])) {
            return false;
        }

        // Can't remove the tenant owner unless you're the owner
        $targetRole = $model->getTenantRole($tenant);
        if ($targetRole === 'owner' && $role !== 'owner') {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        // Users cannot delete other users through this policy
        // User deletion should be handled through tenant membership removal
        return false;
    }

    /**
     * Determine whether the user can upload avatar.
     */
    public function uploadAvatar(User $user, User $model): bool
    {
        // Users can only upload their own avatar
        return $user->id === $model->id;
    }

    /**
     * Determine whether the user can remove avatar.
     */
    public function removeAvatar(User $user, User $model): bool
    {
        // Users can only remove their own avatar
        return $user->id === $model->id;
    }
}
