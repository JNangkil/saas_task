<?php

namespace App\Http\Controllers;

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
        $members = $workspace->users()
            ->wherePivot('status', 'active')
            ->withPivot('role', 'joined_at', 'invited_by')
            ->paginate($perPage);

        // Get pending invitations count
        $pendingInvitationsCount = Invitation::where('workspace_id', $workspace->id)
            ->where('status', 'pending')
            ->count();

        return response()->json([
            'members' => WorkspaceMemberResource::collection($members),
            'pending_invitations_count' => $pendingInvitationsCount,
            'pagination' => [
                'current_page' => $members->currentPage(),
                'last_page' => $members->lastPage(),
                'per_page' => $members->perPage(),
                'total' => $members->total(),
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
            'role' => ['required', Rule::in(['owner', 'admin', 'member', 'viewer'])],
        ]);

        // Get current user
        $currentUser = auth()->user();
        $currentUserRole = $workspace->getUserRole($currentUser);
        $targetUserRole = $workspace->getUserRole($user);

        // Check if target user is a member of the workspace
        if (!$targetUserRole) {
            return response()->json([
                'message' => 'User is not a member of this workspace',
            ], 404);
        }

        // Prevent privilege escalation beyond current user's role
        if ($this->isRoleHigher($validated['role'], $currentUserRole)) {
            return response()->json([
                'message' => 'You cannot assign a role higher than your own',
            ], 403);
        }

        // Prevent owners from being demoted by non-owners
        if ($targetUserRole === 'owner' && $currentUserRole !== 'owner') {
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
        $currentUserRole = $workspace->getUserRole($currentUser);
        $targetUserRole = $workspace->getUserRole($user);

        // Check if target user is a member of the workspace
        if (!$targetUserRole) {
            return response()->json([
                'message' => 'User is not a member of this workspace',
            ], 404);
        }

        // Prevent removal of workspace owners by non-owners
        if ($targetUserRole === 'owner' && $currentUserRole !== 'owner') {
            return response()->json([
                'message' => 'Only owners can remove other owners',
            ], 403);
        }

        // Prevent self-removal of the last owner
        if ($currentUser->id === $user->id && $targetUserRole === 'owner') {
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
        $role = $workspace->getUserRole($user);

        // Define permissions based on role
        $permissions = $this->getRolePermissions($role);

        return response()->json([
            'role' => $role,
            'permissions' => $permissions,
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
        $currentUserRole = $workspace->getUserRole($currentUser);
        $targetUserRole = $workspace->getUserRole($user);

        // Check if current user is the owner
        if ($currentUserRole !== 'owner') {
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

    /**
     * Check if a role is higher than another role.
     */
    private function isRoleHigher(string $role1, string $role2): bool
    {
        $roleHierarchy = [
            'viewer' => 1,
            'member' => 2,
            'admin' => 3,
            'owner' => 4,
        ];

        return $roleHierarchy[$role1] > $roleHierarchy[$role2];
    }

    /**
     * Get permissions based on role.
     */
    private function getRolePermissions(?string $role): array
    {
        $permissions = [
            'viewer' => [
                'view_workspace' => true,
                'view_boards' => true,
                'view_members' => true,
                'create_boards' => false,
            ],
            'member' => [
                'view_workspace' => true,
                'view_boards' => true,
                'view_members' => true,
                'create_boards' => true,
                'manage_members' => false,
            ],
            'admin' => [
                'view_workspace' => true,
                'view_boards' => true,
                'view_members' => true,
                'create_boards' => true,
                'manage_workspace' => true,
                'manage_members' => true,
                'manage_settings' => true,
                'view_analytics' => true,
                'invite_members' => true,
                'transfer_ownership' => false,
                'delete_workspace' => false,
            ],
            'owner' => [
                'view_workspace' => true,
                'view_boards' => true,
                'view_members' => true,
                'create_boards' => true,
                'manage_workspace' => true,
                'manage_members' => true,
                'manage_settings' => true,
                'view_analytics' => true,
                'invite_members' => true,
                'transfer_ownership' => true,
                'delete_workspace' => true,
            ],
        ];

        return $permissions[$role] ?? [];
    }
}