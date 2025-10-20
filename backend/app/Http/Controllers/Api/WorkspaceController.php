<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Workspace\StoreWorkspaceRequest;
use App\Http\Requests\Workspace\UpdateWorkspaceRequest;
use App\Http\Resources\WorkspaceResource;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class WorkspaceController extends Controller
{
    /**
     * List the authenticated user's workspaces.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $workspaces = $user->workspaces()->orderBy('name')->get();

        return WorkspaceResource::collection($workspaces);
    }

    /**
     * Create a new workspace for the authenticated user.
     */
    public function store(StoreWorkspaceRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if (! $this->canManageWorkspaces($user)) {
            abort(403, 'Only owners or admins can create new workspaces.');
        }

        $validated = $request->validated();
        $locale = $validated['default_locale'] ?? $user->locale ?? 'en';

        /** @var \App\Models\Workspace $workspace */
        $workspace = DB::transaction(function () use ($validated, $user, $locale): Workspace {
            $workspace = Workspace::create([
                'name' => $validated['name'],
                'default_locale' => $locale,
                'logo_url' => $validated['logo_url'] ?? null,
                'owner_id' => $user->id,
            ]);

            $workspace->members()->attach($user->id, ['role' => 'Owner']);

            return $workspace;
        });

        $workspaceWithMembership = $user->workspaces()->where('workspaces.id', $workspace->id)->firstOrFail();

        return (new WorkspaceResource($workspaceWithMembership))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Show a specific workspace.
     */
    public function show(Request $request, string $workspaceId): WorkspaceResource
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $workspace = $this->findWorkspaceOrAbort($user, $workspaceId);

        return new WorkspaceResource($workspace);
    }

    /**
     * Update a workspace.
     */
    public function update(UpdateWorkspaceRequest $request, string $workspaceId): WorkspaceResource
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $workspace = $this->findWorkspaceOrAbort($user, $workspaceId);

        if (! in_array($workspace->pivot->role, ['Owner', 'Admin'], true)) {
            abort(403, 'You do not have permission to update this workspace.');
        }

        $validated = $request->validated();
        $workspace->fill([
            'name' => $validated['name'] ?? $workspace->name,
            'default_locale' => $validated['default_locale'] ?? $workspace->default_locale,
            'logo_url' => array_key_exists('logo_url', $validated) ? $validated['logo_url'] : $workspace->logo_url,
        ])->save();

        $workspace->refresh();

        $workspace = $user->workspaces()->where('workspaces.id', $workspace->id)->firstOrFail();

        return new WorkspaceResource($workspace);
    }

    /**
     * Delete a workspace.
     */
    public function destroy(Request $request, string $workspaceId): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $workspace = $this->findWorkspaceOrAbort($user, $workspaceId);

        if ($workspace->pivot->role !== 'Owner') {
            abort(403, 'Only workspace owners can delete a workspace.');
        }

        DB::transaction(static function () use ($workspace): void {
            $workspace->members()->detach();
            $workspace->delete();
        });

        return response()->json([
            'message' => 'Workspace deleted successfully.',
        ]);
    }

    /**
     * Determine if the user can create/manage workspaces.
     */
    private function canManageWorkspaces(User $user): bool
    {
        $roles = $user->roles ?? [];

        return in_array('Owner', $roles, true) || in_array('Admin', $roles, true);
    }

    /**
     * Fetch a workspace the user belongs to or abort with 404/403 as appropriate.
     */
    private function findWorkspaceOrAbort(User $user, string $workspaceId): Workspace
    {
        $workspace = $user->workspaces()->where('workspaces.id', $workspaceId)->first();

        if (! $workspace) {
            abort(404, 'Workspace not found.');
        }

        return $workspace;
    }
}

