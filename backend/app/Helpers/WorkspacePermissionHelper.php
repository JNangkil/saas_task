<?php

namespace App\Helpers;

use App\Enums\WorkspaceRole;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\Cache;

class WorkspacePermissionHelper
{
    /**
     * Check if a user has a specific permission in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @param string $permission
     * @return bool
     */
    public static function userHasPermission(User $user, Workspace $workspace, string $permission): bool
    {
        // Owners have all permissions
        if ($workspace->owner_id === $user->id) {
            return true;
        }

        // Check if user is a member of the workspace
        $membership = $workspace->members()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (!$membership) {
            return false;
        }

        // Get user's role
        $role = WorkspaceRole::fromString($membership->role);

        return $role->hasPermission($permission);
    }

    /**
     * Get user's role in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return WorkspaceRole|null
     */
    public static function getUserRole(User $user, Workspace $workspace): ?WorkspaceRole
    {
        // Check if user is the owner
        if ($workspace->owner_id === $user->id) {
            return WorkspaceRole::OWNER;
        }

        // Check membership
        $membership = $workspace->members()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (!$membership) {
            return null;
        }

        return WorkspaceRole::fromString($membership->role);
    }

    /**
     * Check if a user can manage another user's role in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @param User $targetUser
     * @return bool
     */
    public static function canManageUser(User $user, Workspace $workspace, User $targetUser): bool
    {
        $userRole = self::getUserRole($user, $workspace);
        $targetRole = self::getUserRole($targetUser, $workspace);

        if (!$userRole || !$targetRole) {
            return false;
        }

        // Owners cannot be managed by others
        if ($targetRole->isOwner()) {
            return false;
        }

        return $userRole->canManageRole($targetRole);
    }

    /**
     * Check if a user can invite members to a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canInviteMembers(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'members.invite');
    }

    /**
     * Check if a user can remove members from a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canRemoveMembers(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'members.remove');
    }

    /**
     * Check if a user can manage boards in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canManageBoards(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'boards.manage');
    }

    /**
     * Check if a user can create boards in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canCreateBoards(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'boards.create');
    }

    /**
     * Check if a user can delete boards in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canDeleteBoards(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'boards.delete');
    }

    /**
     * Check if a user can create tasks in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canCreateTasks(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'tasks.create');
    }

    /**
     * Check if a user can assign tasks in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canAssignTasks(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'tasks.assign');
    }

    /**
     * Check if a user can delete tasks in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canDeleteTasks(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'tasks.delete');
    }

    /**
     * Check if a user can manage comments in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canManageComments(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'comments.manage');
    }

    /**
     * Check if a user can view analytics in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canViewAnalytics(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'analytics.view');
    }

    /**
     * Check if a user can manage workspace settings
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canManageSettings(User $user, Workspace $workspace): bool
    {
        return self::userHasPermission($user, $workspace, 'workspace.settings');
    }

    /**
     * Check if a user can delete the workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return bool
     */
    public static function canDeleteWorkspace(User $user, Workspace $workspace): bool
    {
        // Only owners can delete workspaces
        return $workspace->owner_id === $user->id;
    }

    /**
     * Get all available roles a user can assign in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return array
     */
    public static function getAssignableRoles(User $user, Workspace $workspace): array
    {
        $userRole = self::getUserRole($user, $workspace);

        if (!$userRole) {
            return [];
        }

        return $userRole->getAssignableRoles()
            ->mapWithKeys(fn($role) => [$role->value => $role->getDisplayName()])
            ->toArray();
    }

    /**
     * Cache user permissions for a workspace to improve performance
     *
     * @param User $user
     * @param Workspace $workspace
     * @param string $key
     * @param mixed $value
     * @param int $ttl
     * @return mixed
     */
    private static function cachePermission(User $user, Workspace $workspace, string $key, $value = null, int $ttl = 300)
    {
        $cacheKey = "workspace_permission:{$workspace->id}:{$user->id}:{$key}";

        if ($value !== null) {
            Cache::put($cacheKey, $value, $ttl);
            return $value;
        }

        return Cache::remember($cacheKey, $ttl, function () use ($user, $workspace, $key) {
            return match($key) {
                'role' => self::getUserRole($user, $workspace),
                'permissions' => self::getUserRole($user, $workspace)?->getPermissions()->toArray() ?? [],
                default => null,
            };
        });
    }

    /**
     * Clear cached permissions for a user in a workspace
     *
     * @param User $user
     * @param Workspace $workspace
     * @return void
     */
    public static function clearPermissionCache(User $user, Workspace $workspace): void
    {
        $pattern = "workspace_permission:{$workspace->id}:{$user->id}:*";
        Cache::forget($pattern);
    }

    /**
     * Get all workspaces where the user has a specific permission
     *
     * @param User $user
     * @param string $permission
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getWorkspacesWithPermission(User $user, string $permission)
    {
        // Get workspaces where user is owner
        $ownedWorkspaces = $user->ownedWorkspaces()->get();

        // Get workspaces where user is a member with the permission
        $memberWorkspaces = $user->workspaces()
            ->where('status', 'active')
            ->get()
            ->filter(function ($workspace) use ($user, $permission) {
                return self::userHasPermission($user, $workspace, $permission);
            });

        return $ownedWorkspaces->merge($memberWorkspaces);
    }
}