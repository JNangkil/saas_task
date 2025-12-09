<?php

namespace App\Providers;

use App\Helpers\WorkspacePermissionHelper;
use App\Models\Invitation;
use App\Models\Task;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Workspace;
use App\Policies\InvitationPolicy;
use App\Policies\TaskPolicy;
use App\Policies\TenantPolicy;
use App\Policies\WorkspacePolicy;
use App\Services\JWTService;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Invitation::class => InvitationPolicy::class,
        Task::class => TaskPolicy::class,
        Tenant::class => TenantPolicy::class,
        Workspace::class => WorkspacePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Register JWT service
        $this->app->singleton(JWTService::class, function ($app) {
            return new JWTService();
        });

        // Register gates for additional authorization checks
        $this->registerGates();
    }

    /**
     * Register additional gates.
     */
    protected function registerGates(): void
    {
        // Super admin gate - can bypass tenant restrictions
        Gate::define('super-admin', function (User $user) {
            // Implement your super admin logic here
            // For example: return $user->email === 'admin@example.com';
            return false; // Default to false until implemented
        });

        // Tenant member gate - can access tenant-scoped routes
        Gate::define('tenant-member', function (User $user, ?Tenant $tenant = null) {
            if (!$tenant) {
                $tenant = tenant();
            }
            
            return $tenant && $tenant->users()->where('users.id', $user->id)->exists();
        });

        // Workspace member gate - can access workspace-scoped routes
        Gate::define('workspace-member', function (User $user, ?Workspace $workspace = null) {
            if (!$workspace) {
                // Check if user belongs to any workspace in current tenant
                $tenant = tenant();
                return $tenant && $user->workspaces()
                    ->whereHas('tenant', fn($query) => $query->where('id', $tenant->id))
                    ->exists();
            }
            
            return $workspace->users()->where('users.id', $user->id)->exists();
        });

        // Tenant management gate - can manage tenant settings
        Gate::define('manage-tenant', function (User $user, ?Tenant $tenant = null) {
            if (!$tenant) {
                $tenant = tenant();
            }
            
            return $tenant && $tenant->canUserManage($user);
        });

        // Workspace management gate - can manage workspace settings
        Gate::define('manage-workspace', function (User $user, ?Workspace $workspace = null) {
            if (!$workspace) {
                // Check if user can manage any workspace in current tenant
                $tenant = tenant();
                if (!$tenant) return false;
                
                return $user->workspaces()
                    ->whereHas('tenant', fn($query) => $query->where('id', $tenant->id))
                    ->wherePivot('role', 'admin')
                    ->exists();
            }
            
            return $workspace->canUserManage($user);
        });

        // Create workspace gate - can create workspaces in tenant
        Gate::define('create-workspaces', function (User $user) {
            $tenant = tenant();
            return $tenant && $tenant->canUserManage($user);
        });

        // Create boards gate - can create boards in workspace
        Gate::define('create-boards', function (User $user, ?Workspace $workspace = null) {
            if (!$workspace) {
                // Check if user can create boards in any workspace in current tenant
                $tenant = tenant();
                if (!$tenant) return false;
                
                return $user->workspaces()
                    ->whereHas('tenant', fn($query) => $query->where('id', $tenant->id))
                    ->whereIn('workspace_user.role', ['admin', 'member'])
                    ->exists();
            }
            
            return $workspace->canUserCreateBoardsInWorkspace($user);
        });

        // Role-based gates for tenant permissions
        Gate::define('tenant-owner', function (User $user, ?Tenant $tenant = null) {
            if (!$tenant) {
                $tenant = tenant();
            }
            return $tenant && $tenant->hasUserRole($user, 'owner');
        });

        Gate::define('tenant-admin', function (User $user, ?Tenant $tenant = null) {
            if (!$tenant) {
                $tenant = tenant();
            }
            return $tenant && $tenant->hasUserRole($user, 'admin');
        });

        Gate::define('tenant-member', function (User $user, ?Tenant $tenant = null) {
            if (!$tenant) {
                $tenant = tenant();
            }
            return $tenant && $tenant->hasUserRole($user, 'member');
        });

        Gate::define('tenant-viewer', function (User $user, ?Tenant $tenant = null) {
            if (!$tenant) {
                $tenant = tenant();
            }
            return $tenant && $tenant->hasUserRole($user, 'viewer');
        });

        // Role-based gates for workspace permissions
        Gate::define('workspace-owner', function (User $user, ?Workspace $workspace = null) {
            if (!$workspace) {
                return false;
            }
            return $workspace->hasUserRole($user, 'owner');
        });

        Gate::define('workspace-admin', function (User $user, ?Workspace $workspace = null) {
            if (!$workspace) {
                return false;
            }
            return $workspace->hasUserRole($user, 'admin');
        });

        Gate::define('workspace-member', function (User $user, ?Workspace $workspace = null) {
            if (!$workspace) {
                return false;
            }
            return $workspace->hasUserRole($user, 'member');
        });

        Gate::define('workspace-viewer', function (User $user, ?Workspace $workspace = null) {
            if (!$workspace) {
                return false;
            }
            return $workspace->hasUserRole($user, 'viewer');
        });

        // Workspace permission gates using the WorkspacePermissionHelper
        Gate::define('workspace.permission', function (User $user, Workspace $workspace, string $permission) {
            return WorkspacePermissionHelper::userHasPermission($user, $workspace, $permission);
        });

        // Specific permission gates for convenience
        Gate::define('workspace.invite-members', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canInviteMembers($user, $workspace);
        });

        Gate::define('workspace.remove-members', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canRemoveMembers($user, $workspace);
        });

        Gate::define('workspace.manage-boards', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canManageBoards($user, $workspace);
        });

        Gate::define('workspace.create-boards', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canCreateBoards($user, $workspace);
        });

        Gate::define('workspace.delete-boards', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canDeleteBoards($user, $workspace);
        });

        Gate::define('workspace.create-tasks', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canCreateTasks($user, $workspace);
        });

        Gate::define('workspace.assign-tasks', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canAssignTasks($user, $workspace);
        });

        Gate::define('workspace.delete-tasks', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canDeleteTasks($user, $workspace);
        });

        Gate::define('workspace.manage-comments', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canManageComments($user, $workspace);
        });

        Gate::define('workspace.view-analytics', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canViewAnalytics($user, $workspace);
        });

        Gate::define('workspace.manage-settings', function (User $user, Workspace $workspace) {
            return WorkspacePermissionHelper::canManageSettings($user, $workspace);
        });

        // Gate to check if user can manage another user in workspace
        Gate::define('workspace.manage-user', function (User $user, Workspace $workspace, User $targetUser) {
            return WorkspacePermissionHelper::canManageUser($user, $workspace, $targetUser);
        });
    }
}