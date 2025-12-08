<?php

namespace App\Http\Controllers;

use App\Http\Requests\TaskIndexRequest;
use App\Http\Requests\TaskRequest;
use App\Http\Requests\TaskPositionRequest;
use App\Http\Resources\TaskCollection;
use App\Http\Resources\TaskResource;
use App\Models\Board;
use App\Models\Task;
use App\Models\TaskCustomValue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    /**
     * Display a listing of tasks for a board or workspace.
     */
    public function index(TaskIndexRequest $request, $tenantId, $workspaceId, $boardId = null): JsonResponse
    {
        $user = Auth::user();
        
        // Verify user belongs to tenant
        $tenant = $user->tenants()->find($tenantId);
        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        // Verify user belongs to workspace
        $workspace = $tenant->workspaces()->find($workspaceId);
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found'], 404);
        }

        // Build the query
        $query = Task::where('workspace_id', $workspaceId)
            ->where('tenant_id', $tenantId);

        // Filter by board if specified
        if ($boardId) {
            $board = $workspace->boards()->find($boardId);
            if (!$board) {
                return response()->json(['error' => 'Board not found'], 404);
            }
            $query->where('board_id', $boardId);
        }

        // Apply filters
        $query->when($request->get('search'), function ($query, $search) {
            $query->where(function ($query) use ($search) {
                $query->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
            });
        });

        $query->when($request->get('status'), function ($query, $statuses) {
            $query->whereIn('status', $statuses);
        });

        $query->when($request->get('priority'), function ($query, $priorities) {
            $query->whereIn('priority', $priorities);
        });

        $query->when($request->get('assignee_id'), function ($query, $assigneeIds) {
            $query->whereIn('assignee_id', $assigneeIds);
        });

        $query->when($request->get('creator_id'), function ($query, $creatorIds) {
            $query->whereIn('creator_id', $creatorIds);
        });

        $query->when($request->get('due_date_from'), function ($query, $date) {
            $query->whereDate('due_date', '>=', $date);
        });

        $query->when($request->get('due_date_to'), function ($query, $date) {
            $query->whereDate('due_date', '<=', $date);
        });

        $query->when($request->get('start_date_from'), function ($query, $date) {
            $query->whereDate('start_date', '>=', $date);
        });

        $query->when($request->get('start_date_to'), function ($query, $date) {
            $query->whereDate('start_date', '<=', $date);
        });

        $query->when($request->get('created_at_from'), function ($query, $date) {
            $query->whereDate('created_at', '>=', $date);
        });

        $query->when($request->get('created_at_to'), function ($query, $date) {
            $query->whereDate('created_at', '<=', $date);
        });

        // Filter by labels
        $query->when($request->get('labels'), function ($query, $labelIds) {
            $query->whereHas('labels', function ($query) use ($labelIds) {
                $query->whereIn('labels.id', $labelIds);
            });
        });

        // Include archived or not
        if (!$request->get('include_archived', false)) {
            $query->whereNull('archived_at');
        }

        // Apply sorting
        $sortBy = $request->get('sort_by', 'position');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Include relationships
        $includes = $request->get('include', []);
        if (in_array('labels', $includes)) {
            $query->with('labels');
        }
        if (in_array('custom_values', $includes)) {
            $query->with('customValues');
        }
        if (in_array('assignee', $includes)) {
            $query->with('assignee');
        }
        if (in_array('creator', $includes)) {
            $query->with('creator');
        }
        if (in_array('board', $includes)) {
            $query->with('board');
        }
        if (in_array('workspace', $includes)) {
            $query->with('workspace');
        }
        if (in_array('comments', $includes)) {
            $query->with('comments');
        }

        // Use cursor-based pagination if cursor is provided
        if ($request->get('cursor')) {
            $tasks = $query->cursorPaginate($request->get('per_page', 15));
        } else {
            $tasks = $query->paginate($request->get('per_page', 15));
        }

        return new TaskCollection($tasks);
    }

    /**
     * Store a newly created task in storage.
     */
    public function store(TaskRequest $request, $tenantId, $workspaceId): JsonResponse
    {
        $user = Auth::user();
        
        // Verify user belongs to tenant
        $tenant = $user->tenants()->find($tenantId);
        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        // Verify user belongs to workspace
        $workspace = $tenant->workspaces()->find($workspaceId);
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found'], 404);
        }

        return DB::transaction(function () use ($request, $user, $tenant, $workspace) {
            $validated = $request->validated();
            
            $task = Task::create(array_merge($validated, [
                'tenant_id' => $tenant->id,
                'workspace_id' => $workspace->id,
                'creator_id' => $user->id,
                'position' => $validated['position'] ?? $this->getNextPosition($validated['board_id']),
            ]));

            // Handle labels
            if (isset($validated['labels'])) {
                $task->labels()->sync($validated['labels']);
            }

            // Handle custom values
            if (isset($validated['custom_values'])) {
                foreach ($validated['custom_values'] as $customValue) {
                    TaskCustomValue::create([
                        'task_id' => $task->id,
                        'field_name' => $customValue['field_name'],
                        'field_type' => $customValue['field_type'],
                        'value' => $customValue['value'],
                    ]);
                }
            }

            return (new TaskResource($task->load(['labels', 'customValues', 'assignee', 'creator'])))
                ->response()
                ->setStatusCode(201);
        });
    }

    /**
     * Display the specified task.
     */
    public function show($tenantId, $workspaceId, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        // Verify task belongs to the specified workspace and tenant
        if ($task->workspace_id != $workspaceId || $task->tenant_id != $tenantId) {
            return response()->json(['error' => 'Task not found in specified workspace/tenant'], 404);
        }

        $task->load(['labels', 'customValues', 'assignee', 'creator', 'board', 'workspace', 'comments']);

        return new TaskResource($task);
    }

    /**
     * Update the specified task in storage.
     */
    public function update(TaskRequest $request, $tenantId, $workspaceId, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        // Verify task belongs to the specified workspace and tenant
        if ($task->workspace_id != $workspaceId || $task->tenant_id != $tenantId) {
            return response()->json(['error' => 'Task not found in specified workspace/tenant'], 404);
        }

        return DB::transaction(function () use ($request, $task) {
            $validated = $request->validated();

            // Update task
            $task->update($validated);

            // Handle labels
            if (isset($validated['labels'])) {
                $task->labels()->sync($validated['labels']);
            }

            // Handle custom values
            if (isset($validated['custom_values'])) {
                // Delete existing custom values
                $task->customValues()->delete();
                
                // Create new custom values
                foreach ($validated['custom_values'] as $customValue) {
                    TaskCustomValue::create([
                        'task_id' => $task->id,
                        'field_name' => $customValue['field_name'],
                        'field_type' => $customValue['field_type'],
                        'value' => $customValue['value'],
                    ]);
                }
            }

            return new TaskResource($task->fresh(['labels', 'customValues', 'assignee', 'creator']));
        });
    }

    /**
     * Remove the specified task from storage (soft delete).
     */
    public function destroy($tenantId, $workspaceId, Task $task): JsonResponse
    {
        $this->authorize('delete', $task);

        // Verify task belongs to the specified workspace and tenant
        if ($task->workspace_id != $workspaceId || $task->tenant_id != $tenantId) {
            return response()->json(['error' => 'Task not found in specified workspace/tenant'], 404);
        }

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully',
        ]);
    }

    /**
     * Archive the specified task.
     */
    public function archive($tenantId, $workspaceId, Task $task): JsonResponse
    {
        $this->authorize('archive', $task);

        // Verify task belongs to the specified workspace and tenant
        if ($task->workspace_id != $workspaceId || $task->tenant_id != $tenantId) {
            return response()->json(['error' => 'Task not found in specified workspace/tenant'], 404);
        }

        $task->archive();

        return response()->json([
            'message' => 'Task archived successfully',
        ]);
    }

    /**
     * Restore the specified archived task.
     */
    public function restore($tenantId, $workspaceId, Task $task): JsonResponse
    {
        $this->authorize('restore', $task);

        // Verify task belongs to the specified workspace and tenant
        if ($task->workspace_id != $workspaceId || $task->tenant_id != $tenantId) {
            return response()->json(['error' => 'Task not found in specified workspace/tenant'], 404);
        }

        $task->update([
            'status' => 'todo',
            'archived_at' => null,
        ]);

        return response()->json([
            'message' => 'Task restored successfully',
        ]);
    }

    /**
     * Duplicate the specified task.
     */
    public function duplicate($tenantId, $workspaceId, Task $task): JsonResponse
    {
        $this->authorize('duplicate', $task);

        // Verify task belongs to the specified workspace and tenant
        if ($task->workspace_id != $workspaceId || $task->tenant_id != $tenantId) {
            return response()->json(['error' => 'Task not found in specified workspace/tenant'], 404);
        }

        return DB::transaction(function () use ($task) {
            $user = Auth::user();
            
            // Create new task based on existing one
            $newTask = $task->replicate();
            $newTask->title = $task->title . ' (Copy)';
            $newTask->creator_id = $user->id;
            $newTask->assignee_id = null;
            $newTask->status = 'todo';
            $newTask->completed_at = null;
            $newTask->archived_at = null;
            $newTask->position = $this->getNextPosition($task->board_id);
            $newTask->save();

            // Duplicate labels
            $labelIds = $task->labels()->pluck('labels.id')->toArray();
            if (!empty($labelIds)) {
                $newTask->labels()->sync($labelIds);
            }

            // Duplicate custom values
            $customValues = $task->customValues()->get();
            foreach ($customValues as $customValue) {
                TaskCustomValue::create([
                    'task_id' => $newTask->id,
                    'field_name' => $customValue->field_name,
                    'field_type' => $customValue->field_type,
                    'value' => $customValue->value,
                ]);
            }

            return (new TaskResource($newTask->load(['labels', 'customValues', 'assignee', 'creator'])))
                ->response()
                ->setStatusCode(201);
        });
    }

    /**
     * Update the position of the specified task.
     */
    public function updatePosition(TaskPositionRequest $request, $tenantId, $workspaceId, Task $task): JsonResponse
    {
        $this->authorize('updatePosition', $task);

        // Verify task belongs to the specified workspace and tenant
        if ($task->workspace_id != $workspaceId || $task->tenant_id != $tenantId) {
            return response()->json(['error' => 'Task not found in specified workspace/tenant'], 404);
        }

        return DB::transaction(function () use ($request, $task) {
            $validated = $request->validated();

            // Update position and optionally board and status
            $task->update([
                'position' => $validated['position'],
                'board_id' => $validated['board_id'] ?? $task->board_id,
                'status' => $validated['status'] ?? $task->status,
            ]);

            return new TaskResource($task->fresh());
        });
    }

    /**
     * Get the next position for a new task in a board.
     *
     * @param int $boardId
     * @return float
     */
    private function getNextPosition(int $boardId): float
    {
        $lastTask = Task::where('board_id', $boardId)
            ->orderBy('position', 'desc')
            ->first();

        return $lastTask ? $lastTask->position + 1000 : 1000;
    }
}