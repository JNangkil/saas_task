<?php

namespace App\Http\Controllers;

use App\Http\Resources\AttachmentResource;
use App\Models\Attachment;
use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AttachmentController extends Controller
{
    /**
     * Store a newly created attachment in storage.
     */
    public function store(Request $request, $tenantId, $workspaceId, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        if ($task->workspace_id != $workspaceId || $task->tenant_id != $tenantId) {
            return response()->json(['error' => 'Task not found in specified workspace/tenant'], 404);
        }

        $validated = $request->validate([
            'file' => 'required|file|max:10240', // Max 10MB
            'task_comment_id' => 'nullable|exists:task_comments,id',
        ]);

        $file = $validated['file'];
        $originalFilename = $file->getClientOriginalName();
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();

        // Store file in tenant-specific directory
        $path = $file->storeAs(
            "tenants/{$tenantId}/attachments",
            $filename,
            'local'
        );

        $attachment = Attachment::create([
            'tenant_id' => $tenantId,
            'task_id' => $task->id,
            'task_comment_id' => $validated['task_comment_id'] ?? null,
            'user_id' => Auth::id(),
            'filename' => $filename,
            'original_filename' => $originalFilename,
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'path' => $path,
            'disk' => 'local',
        ]);

        $attachment->load('user');

        return (new AttachmentResource($attachment))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified attachment.
     */
    public function show($tenantId, $workspaceId, Attachment $attachment): JsonResponse
    {
        // Check if user has access to the attachment through task or comment
        if ($attachment->tenant_id != $tenantId) {
            return response()->json(['error' => 'Attachment not found'], 404);
        }

        $hasAccess = false;

        // Check through task
        if ($attachment->task_id) {
            $task = Task::find($attachment->task_id);
            if ($task && $task->tenant_id == $tenantId && $task->workspace_id == $workspaceId) {
                $this->authorize('view', $task);
                $hasAccess = true;
            }
        }

        // Check through comment
        if (!$hasAccess && $attachment->task_comment_id) {
            $comment = TaskComment::find($attachment->task_comment_id);
            if ($comment) {
                $task = Task::find($comment->task_id);
                if ($task && $task->tenant_id == $tenantId && $task->workspace_id == $workspaceId) {
                    $this->authorize('view', $task);
                    $hasAccess = true;
                }
            }
        }

        if (!$hasAccess) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return (new AttachmentResource($attachment))->response();
    }

    /**
     * Download the specified attachment.
     */
    public function download($tenantId, $workspaceId, Attachment $attachment)
    {
        // Same access check as show method
        if ($attachment->tenant_id != $tenantId) {
            abort(404);
        }

        $hasAccess = false;

        if ($attachment->task_id) {
            $task = Task::find($attachment->task_id);
            if ($task && $task->tenant_id == $tenantId && $task->workspace_id == $workspaceId) {
                $this->authorize('view', $task);
                $hasAccess = true;
            }
        }

        if (!$hasAccess && $attachment->task_comment_id) {
            $comment = TaskComment::find($attachment->task_comment_id);
            if ($comment) {
                $task = Task::find($comment->task_id);
                if ($task && $task->tenant_id == $tenantId && $task->workspace_id == $workspaceId) {
                    $this->authorize('view', $task);
                    $hasAccess = true;
                }
            }
        }

        if (!$hasAccess) {
            abort(403);
        }

        if (!Storage::disk($attachment->disk)->exists($attachment->path)) {
            abort(404);
        }

        return Storage::disk($attachment->disk)->download(
            $attachment->path,
            $attachment->original_filename
        );
    }

    /**
     * Remove the specified attachment from storage.
     */
    public function destroy($tenantId, $workspaceId, Attachment $attachment): JsonResponse
    {
        // Check if user owns the attachment or has admin rights
        if ($attachment->user_id !== Auth::id() && !$this->isAdminOrManager()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($attachment->tenant_id != $tenantId) {
            return response()->json(['error' => 'Attachment not found'], 404);
        }

        // Verify attachment belongs to a task in this workspace
        $hasAccess = false;

        if ($attachment->task_id) {
            $task = Task::find($attachment->task_id);
            if ($task && $task->tenant_id == $tenantId && $task->workspace_id == $workspaceId) {
                $hasAccess = true;
            }
        }

        if (!$hasAccess && $attachment->task_comment_id) {
            $comment = TaskComment::find($attachment->task_comment_id);
            if ($comment) {
                $task = Task::find($comment->task_id);
                if ($task && $task->tenant_id == $tenantId && $task->workspace_id == $workspaceId) {
                    $hasAccess = true;
                }
            }
        }

        if (!$hasAccess) {
            return response()->json(['error' => 'Attachment not found in this workspace'], 404);
        }

        $attachment->deleteWithFile();

        return response()->json(['message' => 'Attachment deleted successfully']);
    }

    /**
     * Check if current user is admin or manager.
     */
    private function isAdminOrManager(): bool
    {
        $user = Auth::user();
        return in_array($user->role, ['admin', 'manager']);
    }
}
