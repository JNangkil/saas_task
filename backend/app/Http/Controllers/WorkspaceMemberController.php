<?php

namespace App\Http\Controllers;

use App\Enums\WorkspaceRole;
use App\Helpers\WorkspacePermissionHelper;
use App\Http\Resources\WorkspaceMemberResource;
use App\Models\Invitation;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class WorkspaceMemberController extends Controller
{
    /**
     * Display a listing of workspace members and pending invitations.
     */
    public function index(Workspace $workspace): JsonResponse
    {
        // Check if user has permission to view members
        Gate::authorize('view', $workspace);

        // Get active members with their roles
        $perPage = request('per_page', 20);
        $search = request('search');
        $role = request('role');
        $sortBy = request('sort_by', 'joined_at');
        $sortOrder = request('sort_order', 'desc');

        // Build query for members
        $membersQuery = $workspace->users()
            ->wherePivot('status', 'active')
            ->withPivot('role', 'joined_at', 'invited_by');

        // Apply search filter
        if ($search) {
            $membersQuery->where(function ($query) use ($search) {
                $query->where('users.name', 'like', "%{$search}%")
                      ->orWhere('users.email', 'like', "%{$search}%");
            });
        }

        // Apply role filter
        if ($role && in_array($role, ['owner', 'admin', 'member', 'viewer'])) {
            $membersQuery->wherePivot('role', $role);
        }

        // Apply sorting
        if (in_array($sortBy, ['name', 'email', 'role', 'joined_at'])) {
            if ($sortBy === 'name' || $sortBy === 'email') {
                $membersQuery->orderBy("users.{$sortBy}", $sortOrder);
            } else {
                $membersQuery->orderByPivot($sortBy, $sortOrder);
            }
        }

        $members = $membersQuery->paginate($perPage);

        // Get pending invitations count
        $pendingInvitationsCount = Invitation::where('workspace_id', $workspace->id)
            ->where('status', 'pending')
            ->count();

        // Get member statistics
        $memberStats = $workspace->users()
            ->wherePivot('status', 'active')
            ->selectRaw('role, COUNT(*) as count')
            ->groupBy('role')
            ->pluck('count', 'role')
            ->toArray();

        return response()->json([
            'members' => WorkspaceMemberResource::collection($members),
            'pending_invitations_count' => $pendingInvitationsCount,
            'member_stats' => $memberStats,
            'filters' => [
                'search' => $search,
                'role' => $role,
                'sort_by' => $sortBy,
                'sort_order' => $sortOrder,
            ],
            'pagination' => [
                'current_page' => $members->currentPage(),
                'last_page' => $members->lastPage(),
                'per_page' => $members->perPage(),
                'total' => $members->total(),
                'from' => $members->firstItem(),
                'to' => $members->lastItem(),
            ],
        ]);
    }

    /**
     * Update the specified member's role in the workspace.
     */
    public function update(Workspace $workspace, User $user, Request $request): JsonResponse
    {
        // Check if current user has permission to manage roles
        Gate::authorize('updateMemberRoles', $workspace);

        // Validate the request
        $validated = $request->validate([
            'role' => ['required', Rule::in(WorkspaceRole::values())],
        ]);

        // Get current user
        $currentUser = auth()->user();
        $currentUserRole = WorkspacePermissionHelper::getUserRole($currentUser, $workspace);
        $targetUserRole = WorkspacePermissionHelper::getUserRole($user, $workspace);

        // Check if target user is a member of the workspace
        if (!$targetUserRole) {
            return response()->json([
                'message' => 'User is not a member of this workspace',
            ], 404);
        }

        // Get target role enum
        $targetRoleEnum = WorkspaceRole::fromString($validated['role']);

        // Check if current user can assign this role
        if ($currentUserRole && !$currentUserRole->getAssignableRoles()->contains($targetRoleEnum)) {
            return response()->json([
                'message' => 'You cannot assign this role',
            ], 403);
        }

        // Prevent owners from being demoted by non-owners
        if ($targetUserRole->isOwner() && (!$currentUserRole || !$currentUserRole->isOwner())) {
            return response()->json([
                'message' => 'Only owners can modify owner roles',
            ], 403);
        }

        // Update member role in workspace_user pivot table
        $workspace->users()->updateExistingPivot($user->id, [
            'role' => $validated['role'],
        ]);

        // Refresh the user's role in the workspace
        $updatedUser = $workspace->users()
            ->where('users.id', $user->id)
            ->withPivot('role', 'joined_at', 'invited_by')
            ->first();

        return response()->json([
            'message' => 'Member role updated successfully',
            'member' => new WorkspaceMemberResource($updatedUser),
        ]);
    }

    /**
     * Remove the specified member from the workspace.
     */
    public function destroy(Workspace $workspace, User $user): JsonResponse
    {
        // Check if current user has permission to remove members
        Gate::authorize('removeMembers', $workspace);

        $currentUser = auth()->user();
        $currentUserRole = WorkspacePermissionHelper::getUserRole($currentUser, $workspace);
        $targetUserRole = WorkspacePermissionHelper::getUserRole($user, $workspace);

        // Check if target user is a member of the workspace
        if (!$targetUserRole) {
            return response()->json([
                'message' => 'User is not a member of this workspace',
            ], 404);
        }

        // Prevent removal of workspace owners by non-owners
        if ($targetUserRole->isOwner() && (!$currentUserRole || !$currentUserRole->isOwner())) {
            return response()->json([
                'message' => 'Only owners can remove other owners',
            ], 403);
        }

        // Prevent self-removal of the last owner
        if ($currentUser->id === $user->id && $targetUserRole->isOwner()) {
            $ownerCount = $workspace->users()->wherePivot('role', 'owner')->count();
            if ($ownerCount <= 1) {
                return response()->json([
                    'message' => 'You cannot remove yourself as the last owner. Transfer ownership first.',
                ], 403);
            }
        }

        // Remove user from workspace
        $workspace->users()->detach($user->id);

        return response()->json([
            'message' => 'Member removed successfully',
        ]);
    }

    /**
     * Get current user's permissions for the workspace.
     */
    public function permissions(Workspace $workspace): JsonResponse
    {
        // Check if user can view the workspace
        Gate::authorize('view', $workspace);

        $user = auth()->user();
        $roleEnum = WorkspacePermissionHelper::getUserRole($user, $workspace);

        if (!$roleEnum) {
            return response()->json([
                'role' => null,
                'permissions' => [],
            ], 404);
        }

        $role = $roleEnum->value;
        $permissions = $roleEnum->getPermissions()->toArray();
        $displayName = $roleEnum->getDisplayName();

        return response()->json([
            'role' => $role,
            'role_display_name' => $displayName,
            'permissions' => $permissions,
            'can_invite_members' => $roleEnum->canInviteMembers(),
            'can_manage_members' => $roleEnum->hasPermission('members.manage'),
            'can_manage_boards' => $roleEnum->canManageBoards(),
            'can_create_tasks' => $roleEnum->canCreateTasks(),
            'can_view_analytics' => $roleEnum->canViewAnalytics(),
            'is_owner' => $roleEnum->isOwner(),
            'is_admin_or_above' => $roleEnum->isAdminOrAbove(),
        ]);
    }

    /**
     * Transfer ownership to another member.
     */
    public function transferOwnership(Workspace $workspace, User $user, Request $request): JsonResponse
    {
        // Validate the request
        $validated = $request->validate([
            'confirm' => ['required', 'boolean', 'accepted'],
        ]);

        $currentUser = auth()->user();
        $currentUserRole = WorkspacePermissionHelper::getUserRole($currentUser, $workspace);
        $targetUserRole = WorkspacePermissionHelper::getUserRole($user, $workspace);

        // Check if current user is the owner
        if (!$currentUserRole || !$currentUserRole->isOwner()) {
            return response()->json([
                'message' => 'Only owners can transfer ownership',
            ], 403);
        }

        // Validate target user is an active member
        if (!$targetUserRole) {
            return response()->json([
                'message' => 'User is not a member of this workspace',
            ], 404);
        }

        // Prevent self-transfer
        if ($currentUser->id === $user->id) {
            return response()->json([
                'message' => 'You cannot transfer ownership to yourself',
            ], 400);
        }

        // Transfer ownership in a transaction
        DB::transaction(function () use ($workspace, $currentUser, $user) {
            // Transfer ownership to target user
            $workspace->users()->updateExistingPivot($user->id, [
                'role' => 'owner',
            ]);

            // Demote current owner to admin
            $workspace->users()->updateExistingPivot($currentUser->id, [
                'role' => 'admin',
            ]);
        });

        // Get updated member list
        $members = $workspace->users()
            ->wherePivot('status', 'active')
            ->withPivot('role', 'joined_at', 'invited_by')
            ->get();

        return response()->json([
            'message' => 'Ownership transferred successfully',
            'members' => WorkspaceMemberResource::collection($members),
        ]);
    }
}