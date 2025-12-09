<?php

namespace App\Http\Middleware;

use App\Services\PermissionService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $permission  The permission required
     * @param  string|null  $type  The type of permission check (tenant, workspace, etc.)
     */
    public function handle(Request $request, Closure $next, string $permission, ?string $type = null): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Super admins have all permissions
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $hasPermission = false;

        // Determine the type of permission check based on parameter or route
        if ($type === 'tenant' || str_contains($permission, 'tenant:')) {
            // Get tenant from route parameters or current context
            $tenant = $request->route('tenant') ?? tenant();
            $hasPermission = PermissionService::hasTenantPermission($permission, $tenant);
        } elseif ($type === 'workspace' || str_contains($permission, 'workspace:')) {
            // Get workspace from route parameters
            $workspace = $request->route('workspace');
            if ($workspace) {
                $hasPermission = PermissionService::hasWorkspacePermission($permission, $workspace);
            }
        } elseif ($type === 'board' || str_contains($permission, 'board:')) {
            // Get board from route parameters and check through workspace
            $board = $request->route('board');
            if ($board) {
                if ($permission === 'board:view') {
                    $hasPermission = PermissionService::canViewBoard($board);
                } elseif ($permission === 'board:manage') {
                    $hasPermission = PermissionService::canManageBoard($board);
                } else {
                    $hasPermission = PermissionService::hasWorkspacePermission($permission, $board->workspace);
                }
            }
        } elseif ($type === 'task' || str_contains($permission, 'task:')) {
            // Get task from route parameters and check through workspace
            $task = $request->route('task');
            if ($task) {
                if ($permission === 'task:assign') {
                    $hasPermission = PermissionService::canAssignTask($task);
                } elseif ($permission === 'task:manage_watchers') {
                    $hasPermission = PermissionService::canManageTaskWatchers($task);
                } else {
                    $hasPermission = PermissionService::hasWorkspacePermission($permission, $task->workspace);
                }
            }
        } else {
            // Generic check - try to determine from context
            if ($request->route('tenant')) {
                $hasPermission = PermissionService::hasTenantPermission($permission, $request->route('tenant'));
            } elseif ($request->route('workspace')) {
                $hasPermission = PermissionService::hasWorkspacePermission($permission, $request->route('workspace'));
            }
        }

        if (!$hasPermission) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return $next($request);
    }
}
