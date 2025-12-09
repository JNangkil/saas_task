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
     * Get updates for the board since a specific timestamp.
     * Use this for polling fallback when interactions with websocket fail.
     *
     * @param Request $request
     * @param string $tenantId
     * @param string $workspaceId
     * @param Board $board
     * @return JsonResponse
     */
    public function updates(Request $request, string $tenantId, string $workspaceId, Board $board): JsonResponse
    {
        $request->validate([
            'since' => 'required|date',
        ]);

        $since = $request->input('since');

        // Check authorization (ensure user has access to board)
        // This relies on middleware or policy, assuming standard checks pass if we got here via route model binding

        $tasks = $board->tasks()
            ->where('updated_at', '>', $since)
            ->withTrashed() // Include deleted items if we track them via soft deletes, but for sync we might need 'deleted_at'
            ->get();

        $columns = $board->columns()
            ->where('updated_at', '>', $since)
            ->withTrashed()
            ->get();
            
        // Comments for tasks on this board
        $comments = TaskComment::whereIn('task_id', $board->tasks()->pluck('id'))
            ->where('updated_at', '>', $since)
            ->with('user') // Eager load user for display
            ->get();

        return response()->json([
            'tasks' => $tasks,
            'columns' => $columns,
            'comments' => $comments,
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
