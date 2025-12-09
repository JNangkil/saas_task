<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Task;
use App\Models\BoardColumn;
use App\Models\TaskComment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BoardController extends Controller
{
    /**
     * List boards for a workspace.
     */
    public function index(Request $request, string $workspaceId): JsonResponse
    {
        $query = Board::query()
            ->where('workspace_id', $workspaceId)
            ->active(); // Default to active? Or filter?

        if ($request->has('archived') && $request->boolean('archived')) {
            $query = Board::query()->where('workspace_id', $workspaceId)->archived();
        }
        
        // Filter by favorites if requested? Or separate endpoint? 
        // 4.3 says GET /api/user/favorite-boards.
        // 9.4 "Add filter tabs (All, Active, Archived)".

        $boards = $query->with(['creator'])
            ->withCount(['favoritedBy as is_favorite' => function ($query) {
                $query->where('user_id', auth()->id());
            }])
            ->orderBy('position')
            ->orderBy('name')
            ->get();

        // Map is_favorite count to boolean
        $boards->each(function ($board) {
            $board->is_favorite = (bool) $board->is_favorite;
        });

        return response()->json(\App\Http\Resources\BoardResource::collection($boards));
    }

    /**
     * Create a new board.
     */
    public function store(Request $request, string $workspaceId): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'icon' => 'nullable|string|max:50',
            'type' => 'required|string|in:kanban,list,calendar',
            'template_id' => 'nullable|exists:board_templates,id', // For future logic
        ]);

        $board = Board::create([
            'tenant_id' => \App\Models\Workspace::findOrFail($workspaceId)->tenant_id,
            'workspace_id' => $workspaceId,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? null,
            'icon' => $validated['icon'] ?? null,
            'type' => $validated['type'],
            'created_by' => auth()->id(),
            'position' => 0, // Logic to append to end?
        ]);
        
        // TODO: Handle template application logic here if template_id is present (Service call)
        // For now, create default columns if blank? Or handle in service.
        // 6.1 Create BoardFromTemplateService. Ideally we use that.

        return response()->json(new \App\Http\Resources\BoardResource($board), 201);
    }

    /**
     * Show a board.
     */
    public function show(string $boardId): JsonResponse
    {
        $board = Board::with(['columns', 'creator'])
            ->withCount(['favoritedBy as is_favorite' => function ($query) {
                $query->where('user_id', auth()->id());
            }])
            ->findOrFail($boardId);
            
        $board->is_favorite = (bool) $board->is_favorite;

        return response()->json(new \App\Http\Resources\BoardResource($board));
    }

    /**
     * Update a board.
     */
    public function update(Request $request, string $boardId): JsonResponse
    {
        $board = Board::findOrFail($boardId);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:7',
            'icon' => 'nullable|string|max:50',
            'position' => 'sometimes|integer',
        ]);

        $board->update($validated);

        return response()->json(new \App\Http\Resources\BoardResource($board));
    }

    /**
     * Delete a board.
     */
    public function destroy(string $boardId): JsonResponse
    {
        $board = Board::findOrFail($boardId);
        $board->delete(); // Soft delete

        return response()->json(['message' => 'Board deleted successfully']);
    }

    /**
     * Archive a board.
     */
    public function archive(string $boardId): JsonResponse
    {
        $board = Board::findOrFail($boardId);
        $board->archive();

        return response()->json(new \App\Http\Resources\BoardResource($board));
    }

    /**
     * Restore a board.
     */
    public function restore(string $boardId): JsonResponse
    {
        $board = Board::withTrashed()->findOrFail($boardId);
        $board->restore();

        return response()->json(new \App\Http\Resources\BoardResource($board));
    }

    /**
     * Favorite a board.
     */
    public function favorite(string $boardId): JsonResponse
    {
        $board = Board::findOrFail($boardId);
        $board->favoritedBy()->syncWithoutDetaching([auth()->id()]);

        return response()->json(['message' => 'Board added to favorites']);
    }

    /**
     * Unfavorite a board.
     */
    public function unfavorite(string $boardId): JsonResponse
    {
        $board = Board::findOrFail($boardId);
        $board->favoritedBy()->detach(auth()->id());

        return response()->json(['message' => 'Board removed from favorites']);
    }

    /**
     * Get updates for the board since a specific timestamp.
     * Use this for polling fallback when interactions with websocket fail.
     *
     * @param Request $request
     * @param string $boardId
     * @return JsonResponse
     */
    public function updates(Request $request, string $boardId): JsonResponse
    {
        // Support old signature or new?
        // Old: updates(Request $request, string $tenantId, string $workspaceId, Board $board)
        // Adjust based on routes. Assuming route is /api/boards/{board}/updates
        
        $board = Board::findOrFail($boardId); // Or injected if route model binding works with ID only

        $request->validate([
            'since' => 'required|date',
        ]);

        $since = $request->input('since');

        $tasks = $board->tasks()
            ->where('updated_at', '>', $since)
            ->withTrashed()
            ->get();

        $columns = $board->columns()
            ->where('updated_at', '>', $since)
            ->withTrashed()
            ->get();
            
        $comments = TaskComment::whereIn('task_id', $board->tasks()->pluck('id'))
            ->where('updated_at', '>', $since)
            ->with('user')
            ->get();

        return response()->json([
            'tasks' => $tasks,
            'columns' => $columns,
            'comments' => $comments,
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
