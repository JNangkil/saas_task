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
    public function index(Request $request, $tenantId)
    {
        $user = Auth::user();
        
        // Verify user belongs to tenant
        $tenant = $user->tenants()->find($tenantId);
        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        $workspaces = $tenant->workspaces()
            ->withCount(['users', 'boards'])
            ->with(['users' => function ($query) {
                $query->select('users.id', 'name', 'email', 'avatar_url')
                      ->wherePivotIn('role', ['admin', 'member']);
            }])
            ->when($request->get('include_archived'), function ($query) {
                $query->withTrashed();
            }, function ($query) {
                $query->whereNull('deleted_at');
            })
            ->when($request->get('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->get('status'), function ($query, $status) {
                if ($status === 'archived') {
                    $query->whereNotNull('deleted_at');
                } elseif ($status === 'active') {
                    $query->whereNull('deleted_at')->where('is_archived', false);
                } elseif ($status === 'all') {
                    // No additional filtering
                }
            })
            ->when($request->get('is_default'), function ($query, $isDefault) {
                $query->where('is_default', filter_var($isDefault, FILTER_VALIDATE_BOOLEAN));
            })
            ->when($request->get('member_count_min'), function ($query, $min) {
                $query->having('users_count', '>=', (int) $min);
            })
            ->when($request->get('member_count_max'), function ($query, $max) {
                $query->having('users_count', '<=', (int) $max);
            })
            ->when($request->get('created_after'), function ($query, $date) {
                $query->where('created_at', '>=', $date);
            })
            ->when($request->get('created_before'), function ($query, $date) {
                $query->where('created_at', '<=', $date);
            })
            ->when($request->get('sort_by'), function ($query, $sortBy) {
                $sortDirection = $request->get('sort_direction', 'asc');
                $allowedSorts = ['name', 'created_at', 'updated_at', 'users_count', 'boards_count', 'is_default'];
                
                if (in_array($sortBy, $allowedSorts)) {
                    $query->orderBy($sortBy, $sortDirection === 'desc' ? 'desc' : 'asc');
                }
            }, function ($query) {
                $query->orderBy('is_default', 'desc')
                      ->orderBy('name', 'asc');
            });

        // Apply pagination
        $perPage = (int) $request->get('per_page', 15);
        $perPage = max(1, min($perPage, 100)); // Ensure between 1 and 100
        $page = $request->get('page', 1);

        $result = $workspaces->paginate($perPage, ['*'], 'page', $page);

        return WorkspaceResource::collection($result)->additional([
            'meta' => [
                'filters' => [
                    'search' => $request->get('search'),
                    'status' => $request->get('status', 'active'),
                    'is_default' => $request->get('is_default'),
                    'member_count_min' => $request->get('member_count_min'),
                    'member_count_max' => $request->get('member_count_max'),
                    'created_after' => $request->get('created_after'),
                    'created_before' => $request->get('created_before'),
                    'include_archived' => $request->get('include_archived'),
                ],
                'sort' => [
                    'sort_by' => $request->get('sort_by', 'is_default'),
                    'sort_direction' => $request->get('sort_direction', 'asc'),
                ],
                'pagination' => [
                    'per_page' => $perPage,
                    'current_page' => $result->currentPage(),
                    'last_page' => $result->lastPage(),
                    'total' => $result->total(),
                    'from' => $result->firstItem(),
                    'to' => $result->lastItem(),
                ],
            ],
        ]);
    }

    /**
     * Display a listing of workspaces for the current tenant.
     */
    public function currentTenantWorkspaces(Request $request)
    {
        $user = Auth::user();

        // Get current tenant from context
        $tenantId = $request->header('X-Tenant-ID');
        if (!$tenantId) {
            // If no tenant context, try to get user's first tenant
            $tenant = $user->tenants()->first();
            if (!$tenant) {
                // Return empty array if user has no tenants
                return response()->json([
                    'data' => [],
                    'meta' => [
                        'filters' => [
                            'search' => null,
                            'status' => 'active',
                            'is_default' => null,
                            'member_count_min' => null,
                            'member_count_max' => null,
                            'created_after' => null,
                            'created_before' => null,
                            'include_archived' => false,
                        ],
                        'sort' => [
                            'sort_by' => 'is_default',
                            'sort_direction' => 'asc',
                        ],
                        'pagination' => [
                            'per_page' => 15,
                            'current_page' => 1,
                            'last_page' => 1,
                            'total' => 0,
                            'from' => null,
                            'to' => null,
                        ],
                    ],
                ]);
            }
            $tenantId = $tenant->id;
        } else {
            // Verify user belongs to tenant
            $tenant = $user->tenants()->find($tenantId);
            if (!$tenant) {
                return response()->json(['error' => 'Tenant not found'], 404);
            }
        }

        // Reuse the existing index logic with the determined tenant ID
        return $this->index($request, $tenantId);
    }

    /**
     * Store a newly created workspace in storage.
     */
    public function store(WorkspaceRequest $request, $tenantId)
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