<?php

namespace App\Policies;

use App\Helpers\WorkspacePermissionHelper;
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
        // Owners can always view
        if ($workspace->owner_id === $user->id) {
            return true;
        }

        // Check if user is an active member
        return $workspace->members()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();
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
        return WorkspacePermissionHelper::userHasPermission($user, $workspace, 'workspace.manage');
    }

    /**
     * Determine whether the user can delete the workspace.
     */
    public function delete(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::canDeleteWorkspace($user, $workspace);
    }

    /**
     * Determine whether the user can archive the workspace.
     */
    public function archive(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::userHasPermission($user, $workspace, 'workspace.manage');
    }

    /**
     * Determine whether the user can restore the workspace.
     */
    public function restore(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::userHasPermission($user, $workspace, 'workspace.manage');
    }

    /**
     * Determine whether the user can manage workspace members.
     */
    public function manageMembers(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::userHasPermission($user, $workspace, 'members.manage');
    }

    /**
     * Determine whether the user can add members to the workspace.
     */
    public function addMembers(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::canInviteMembers($user, $workspace);
    }

    /**
     * Determine whether the user can remove members from the workspace.
     */
    public function removeMembers(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::canRemoveMembers($user, $workspace);
    }

    /**
     * Determine whether the user can update member roles in the workspace.
     */
    public function updateMemberRoles(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::userHasPermission($user, $workspace, 'members.manage');
    }

    /**
     * Determine whether the user can create boards in the workspace.
     */
    public function createBoards(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::canCreateBoards($user, $workspace);
    }

    /**
     * Determine whether the user can view boards in the workspace.
     */
    public function viewBoards(User $user, Workspace $workspace): bool
    {
        // Anyone who can view the workspace can view boards
        return $this->view($user, $workspace);
    }

    /**
     * Determine whether the user can manage workspace settings.
     */
    public function manageSettings(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::canManageSettings($user, $workspace);
    }

    /**
     * Determine whether the user can view workspace analytics.
     */
    public function viewAnalytics(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::canViewAnalytics($user, $workspace);
    }

    /**
     * Determine whether the user can change workspace default status.
     */
    public function changeDefault(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::userHasPermission($user, $workspace, 'workspace.manage');
    }

    /**
     * Determine whether the user can view workspace activity logs.
     */
    public function viewActivityLogs(User $user, Workspace $workspace): bool
    {
        // Anyone who can view the workspace can view activity logs
        return $this->view($user, $workspace);
    }

    /**
     * Determine whether the user can invite users to the workspace.
     */
    public function inviteUsers(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::canInviteMembers($user, $workspace);
    }

    /**
     * Determine whether the user can manage tasks in the workspace.
     */
    public function manageTasks(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::canDeleteTasks($user, $workspace);
    }

    /**
     * Determine whether the user can view tasks in the workspace.
     */
    public function viewTasks(User $user, Workspace $workspace): bool
    {
        // Anyone who can view the workspace can view tasks
        return $this->view($user, $workspace);
    }

    /**
     * Determine whether the user can export workspace data.
     */
    public function exportData(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::userHasPermission($user, $workspace, 'analytics.view');
    }

    /**
     * Determine whether the user can duplicate the workspace.
     */
    public function duplicate(User $user, Workspace $workspace): bool
    {
        return WorkspacePermissionHelper::userHasPermission($user, $workspace, 'workspace.manage');
    }
}