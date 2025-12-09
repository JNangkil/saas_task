<?php

namespace App\Http\Controllers;

use App\Events\CommentAdded;
use App\Events\CommentDeleted;
use App\Events\CommentUpdated;
use App\Http\Resources\TaskCommentResource;
use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TaskCommentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index($tenantId, $workspaceId, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        if ($task->workspace_id != $workspaceId || $task->tenant_id != $tenantId) {
            return response()->json(['error' => 'Task not found in specified workspace/tenant'], 404);
        }

        $comments = $task->comments()->with('user')->orderBy('created_at', 'desc')->paginate(20);

        return TaskCommentResource::collection($comments)->response();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, $tenantId, $workspaceId, Task $task): JsonResponse
    {
        $this->authorize('view', $task); // Assuming view access allows commenting for now

        if ($task->workspace_id != $workspaceId || $task->tenant_id != $tenantId) {
            return response()->json(['error' => 'Task not found in specified workspace/tenant'], 404);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:5000',
        ]);

        return DB::transaction(function () use ($validated, $task, $tenantId) {
            $comment = TaskComment::create([
                'tenant_id' => $tenantId,
                'task_id' => $task->id,
                'user_id' => Auth::id(),
                'content' => $validated['content'],
            ]);

            $comment->load('user');

            broadcast(new CommentAdded($comment))->toOthers();

            return (new TaskCommentResource($comment))
                ->response()
                ->setStatusCode(201);
        });
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $tenantId, $workspaceId, Task $task, TaskComment $comment): JsonResponse
    {
        // Add authorization check for comment ownership or admin/manager role
        if ($comment->user_id !== Auth::id()) {
             // For now, strict owner check. Enhancements can be added via Policy later.
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($comment->task_id !== $task->id) {
             return response()->json(['error' => 'Comment does not belong to this task'], 404);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:5000',
        ]);

        $comment->update([
            'content' => $validated['content'],
        ]);

        broadcast(new CommentUpdated($comment))->toOthers();

        return (new TaskCommentResource($comment))->response();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($tenantId, $workspaceId, Task $task, TaskComment $comment): JsonResponse
    {
        // Add authorization check for comment ownership or admin/manager role
        if ($comment->user_id !== Auth::id()) {
             // For now, strict owner check. Enhancements can be added via Policy later.
             return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($comment->task_id !== $task->id) {
             return response()->json(['error' => 'Comment does not belong to this task'], 404);
        }

        $commentId = $comment->id;
        $taskId = $task->id;
        $boardId = $task->board_id;
        
        $comment->delete();

        broadcast(new CommentDeleted($commentId, $taskId, $boardId))->toOthers();

        return response()->json(['message' => 'Comment deleted successfully']);
    }
}
