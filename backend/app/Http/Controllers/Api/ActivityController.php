<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityResource;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Models\Board;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ActivityController extends Controller
{
    /**
     * Get activity for a task.
     */
    public function taskActivity(Request $request, Task $task): JsonResponse
    {
        $query = ActivityLog::forSubject($task)
            ->with('user')
            ->latest();

        // Apply filters
        if ($request->has('user_id')) {
            $query->byUser($request->user_id);
        }

        if ($request->has('action')) {
            $query->ofAction($request->action);
        }

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $activities = $query->paginate(20);

        return response()->json([
            'data' => ActivityResource::collection($activities),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    /**
     * Get activity for a board.
     */
    public function boardActivity(Request $request, Board $board): JsonResponse
    {
        $query = ActivityLog::where(function ($q) use ($board) {
                $q->where(function ($subQuery) use ($board) {
                    $subQuery->where('subject_type', 'App\\Models\\Board')
                            ->where('subject_id', $board->id);
                })->orWhere(function ($subQuery) use ($board) {
                    $subQuery->where('subject_type', 'App\\Models\\Task')
                            ->whereIn('subject_id', $board->tasks()->pluck('id'));
                })->orWhere(function ($subQuery) use ($board) {
                    $subQuery->where('subject_type', 'App\\Models\\Column')
                            ->whereIn('subject_id', $board->columns()->pluck('id'));
                });
            })
            ->with('user')
            ->latest();

        // Apply filters
        if ($request->has('user_id')) {
            $query->byUser($request->user_id);
        }

        if ($request->has('action')) {
            $query->ofAction($request->action);
        }

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $activities = $query->paginate(50);

        return response()->json([
            'data' => ActivityResource::collection($activities),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    /**
     * Get activity for a workspace.
     */
    public function workspaceActivity(Request $request, Workspace $workspace): JsonResponse
    {
        $query = ActivityLog::forWorkspace($workspace->id)
            ->with('user')
            ->latest();

        // Apply filters
        if ($request->has('user_id')) {
            $query->byUser($request->user_id);
        }

        if ($request->has('action')) {
            $query->ofAction($request->action);
        }

        if ($request->has('subject_type')) {
            $query->where('subject_type', 'like', '%' . $request->subject_type . '%');
        }

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $activities = $query->paginate(100);

        return response()->json([
            'data' => ActivityResource::collection($activities),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    /**
     * Get activity for the current tenant.
     */
    public function tenantActivity(Request $request): JsonResponse
    {
        $query = ActivityLog::forTenant(tenant()->id)
            ->with('user')
            ->latest();

        // Apply filters
        if ($request->has('user_id')) {
            $query->byUser($request->user_id);
        }

        if ($request->has('workspace_id')) {
            $query->where('workspace_id', $request->workspace_id);
        }

        if ($request->has('action')) {
            $query->ofAction($request->action);
        }

        if ($request->has('subject_type')) {
            $query->where('subject_type', 'like', '%' . $request->subject_type . '%');
        }

        if ($request->has('date_from')) {
            $query->where('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('created_at', '<=', $request->date_to);
        }

        $activities = $query->paginate(200);

        return response()->json([
            'data' => ActivityResource::collection($activities),
            'meta' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
        ]);
    }

    /**
     * Get recent activity for dashboard.
     */
    public function recentActivity(Request $request): JsonResponse
    {
        $limit = min($request->get('limit', 10), 50);

        $query = ActivityLog::forTenant(tenant()->id)
            ->with(['user', 'subject']);

        // Filter to current user's workspace if specified
        if ($request->has('workspace_id')) {
            $query->where('workspace_id', $request->workspace_id);
        } else {
            // Get activities from all user's workspaces
            $workspaceIds = $request->user()->workspaces()->pluck('workspaces.id');
            $query->whereIn('workspace_id', $workspaceIds);
        }

        $activities = $query->latest()
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => ActivityResource::collection($activities),
        ]);
    }
}
