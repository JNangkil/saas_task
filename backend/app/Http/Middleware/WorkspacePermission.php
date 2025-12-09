<?php

namespace App\Http\Middleware;

use App\Helpers\WorkspacePermissionHelper;
use App\Models\Workspace;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class WorkspacePermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Get workspace from route parameter
        $workspaceId = $request->route('workspace');

        if (!$workspaceId) {
            return response()->json(['message' => 'Workspace ID is required.'], 400);
        }

        $workspace = Workspace::find($workspaceId);

        if (!$workspace) {
            return response()->json(['message' => 'Workspace not found.'], 404);
        }

        // Check if user has the required permission
        if (!WorkspacePermissionHelper::userHasPermission($user, $workspace, $permission)) {
            return response()->json([
                'message' => 'You do not have permission to perform this action.',
                'required_permission' => $permission,
                'workspace_id' => $workspace->id,
            ], 403);
        }

        // Add workspace to request for later use
        $request->merge(['workspace' => $workspace]);

        return $next($request);
    }
}