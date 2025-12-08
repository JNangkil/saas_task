<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Auth\Access\Response;

class WorkspacePolicy
{
    /**
     * Determine whether the user can view any workspaces.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the workspace.
     */
    public function view(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserView($user);
    }

    /**
     * Determine whether the user can create workspaces.
     */
    public function create(User $user): bool
    {
        // User must belong to a tenant to create a workspace
        return $user->tenants()->exists();
    }

    /**
     * Determine whether the user can create workspaces in the specific tenant.
     */
    public function createInTenant(User $user, $tenantId): bool
    {
        $tenant = $user->tenants()->where('tenants.id', $tenantId)->first();
        if (!$tenant) {
            return false;
        }
        
        return $tenant->canUserManage($user);
    }

    /**
     * Determine whether the user can update the workspace.
     */
    public function update(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can delete the workspace.
     */
    public function delete(User $user, Workspace $workspace): bool
    {
        // Only tenant owners or admins can delete workspaces
        $tenant = $workspace->tenant;
        if (!$tenant) {
            return false;
        }
        
        return $tenant->canUserManage($user);
    }

    /**
     * Determine whether the user can archive the workspace.
     */
    public function archive(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can restore the workspace.
     */
    public function restore(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can manage workspace members.
     */
    public function manageMembers(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can add members to the workspace.
     */
    public function addMembers(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can remove members from the workspace.
     */
    public function removeMembers(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can update member roles in the workspace.
     */
    public function updateMemberRoles(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can create boards in the workspace.
     */
    public function createBoards(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserCreateBoards($user);
    }

    /**
     * Determine whether the user can view boards in the workspace.
     */
    public function viewBoards(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserView($user);
    }

    /**
     * Determine whether the user can manage workspace settings.
     */
    public function manageSettings(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can view workspace analytics.
     */
    public function viewAnalytics(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can change workspace default status.
     */
    public function changeDefault(User $user, Workspace $workspace): bool
    {
        $tenant = $workspace->tenant;
        if (!$tenant) {
            return false;
        }
        
        return $tenant->canUserManage($user);
    }

    /**
     * Determine whether the user can view workspace activity logs.
     */
    public function viewActivityLogs(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserView($user);
    }
}