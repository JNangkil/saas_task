<?php

namespace App\Http\Controllers;

use App\Http\Requests\WorkspaceRequest;
use App\Http\Resources\WorkspaceResource;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class WorkspaceController extends Controller
{
    /**
     * Display a listing of workspaces for a tenant.
     */
    public function index(Request $request, $tenantId): JsonResponse
    {
        $user = Auth::user();
        
        // Verify user belongs to tenant
        $tenant = $user->tenants()->find($tenantId);
        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        $workspaces = $tenant->workspaces()
            ->withCount('users')
            ->when($request->get('include_archived'), function ($query) {
                $query->withTrashed();
            })
            ->when($request->get('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->paginate($request->get('per_page', 15));

        return WorkspaceResource::collection($workspaces);
    }

    /**
     * Store a newly created workspace in storage.
     */
    public function store(WorkspaceRequest $request, $tenantId): JsonResponse
    {
        $user = Auth::user();
        
        // Verify user belongs to tenant and can create workspaces
        $tenant = $user->tenants()->find($tenantId);
        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        $this->authorize('createInTenant', $tenantId);

        return DB::transaction(function () use ($request, $user, $tenant) {
            $workspace = Workspace::create(array_merge($request->validated(), [
                'tenant_id' => $tenant->id,
            ]));

            // Add the creating user as admin
            $workspace->users()->attach($user->id, [
                'role' => 'admin',
                'joined_at' => now(),
            ]);

            return (new WorkspaceResource($workspace->load('users')))
                ->response()
                ->setStatusCode(201);
        });
    }

    /**
     * Display the specified workspace.
     */
    public function show($tenantId, Workspace $workspace): JsonResponse
    {
        $this->authorize('view', $workspace);
        
        $workspace->load(['users' => function ($query) {
            $query->select('users.id', 'name', 'email', 'workspace_user.role', 'workspace_user.joined_at');
        }]);

        return new WorkspaceResource($workspace);
    }

    /**
     * Update the specified workspace in storage.
     */
    public function update(WorkspaceRequest $request, $tenantId, Workspace $workspace): JsonResponse
    {
        $this->authorize('update', $workspace);
        
        $validated = $request->validated();
        
        // If setting as default, unset default from other workspaces in the same tenant
        if (isset($validated['is_default']) && $validated['is_default']) {
            $workspace->tenant->workspaces()
                ->where('id', '!=', $workspace->id)
                ->update(['is_default' => false]);
        }

        $workspace->update($validated);

        return new WorkspaceResource($workspace->load('users'));
    }

    /**
     * Archive the specified workspace.
     */
    public function archive($tenantId, Workspace $workspace): JsonResponse
    {
        $this->authorize('archive', $workspace);
        
        $workspace->archive();

        return response()->json([
            'message' => 'Workspace archived successfully',
        ]);
    }

    /**
     * Restore the specified workspace.
     */
    public function restore($tenantId, Workspace $workspace): JsonResponse
    {
        $this->authorize('restore', $workspace);
        
        $workspace->restore();

        return response()->json([
            'message' => 'Workspace restored successfully',
        ]);
    }

    /**
     * Remove the specified workspace from storage.
     */
    public function destroy($tenantId, Workspace $workspace): JsonResponse
    {
        $this->authorize('delete', $workspace);
        
        // Don't allow deleting the default workspace
        if ($workspace->is_default) {
            return response()->json([
                'error' => 'Cannot delete the default workspace',
                'message' => 'Please set another workspace as default before deleting this one',
            ], 422);
        }

        $workspace->delete();

        return response()->json([
            'message' => 'Workspace deleted successfully',
        ]);
    }

    /**
     * Get workspace members.
     */
    public function members($tenantId, Workspace $workspace): JsonResponse
    {
        $this->authorize('manageMembers', $workspace);
        
        $members = $workspace->users()->select(
            'users.id',
            'users.name',
            'users.email',
            'workspace_user.role',
            'workspace_user.joined_at'
        )->paginate(15);

        return response()->json($members);
    }

    /**
     * Add a member to the workspace.
     */
    public function addMember(Request $request, $tenantId, Workspace $workspace): JsonResponse
    {
        $this->authorize('addMembers', $workspace);
        
        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'role' => 'required|in:admin,member,viewer',
        ]);

        $user = User::where('email', $validated['email'])->first();
        
        if ($workspace->users()->where('users.id', $user->id)->exists()) {
            return response()->json([
                'message' => 'User is already a member of this workspace',
            ], 422);
        }

        // Check if user belongs to the same tenant
        if (!$workspace->tenant->users()->where('users.id', $user->id)->exists()) {
            return response()->json([
                'message' => 'User does not belong to this tenant',
            ], 422);
        }

        $workspace->users()->attach($user->id, [
            'role' => $validated['role'],
            'joined_at' => now(),
        ]);

        return response()->json([
            'message' => 'Member added successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $validated['role'],
            ],
        ]);
    }

    /**
     * Update a member's role in the workspace.
     */
    public function updateMemberRole(Request $request, $tenantId, Workspace $workspace, User $user): JsonResponse
    {
        $this->authorize('updateMemberRoles', $workspace);
        
        $validated = $request->validate([
            'role' => 'required|in:admin,member,viewer',
        ]);

        $workspace->users()->updateExistingPivot($user->id, [
            'role' => $validated['role'],
        ]);

        return response()->json([
            'message' => 'Member role updated successfully',
        ]);
    }

    /**
     * Remove a member from the workspace.
     */
    public function removeMember($tenantId, Workspace $workspace, User $user): JsonResponse
    {
        $this->authorize('removeMembers', $workspace);
        
        // Don't allow removing the last admin
        $adminCount = $workspace->users()->wherePivot('role', 'admin')->count();
        if ($workspace->getUserRole($user) === 'admin' && $adminCount <= 1) {
            return response()->json([
                'message' => 'Cannot remove the last admin from the workspace',
            ], 422);
        }

        $workspace->users()->detach($user->id);

        return response()->json([
            'message' => 'Member removed successfully',
        ]);
    }

    /**
     * Get workspace settings.
     */
    public function settings($tenantId, Workspace $workspace): JsonResponse
    {
        $this->authorize('manageSettings', $workspace);
        
        return response()->json([
            'name' => $workspace->name,
            'description' => $workspace->description,
            'color' => $workspace->color,
            'icon' => $workspace->icon,
        ]);
    }

    /**
     * Update workspace settings.
     */
    public function updateSettings(Request $request, $tenantId, Workspace $workspace): JsonResponse
    {
        $this->authorize('manageSettings', $workspace);
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string|max:1000',
            'color' => 'sometimes|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'icon' => 'sometimes|string|max:50',
        ]);

        $workspace->update($validated);

        return response()->json([
            'message' => 'Settings updated successfully',
            'workspace' => $workspace->fresh(),
        ]);
    }
}