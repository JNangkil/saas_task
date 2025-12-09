<?php

namespace App\Http\Controllers;

use App\Http\Requests\TaskIndexRequest;
use App\Http\Requests\TaskIndexWithFilterRequest;
use App\Http\Requests\TaskRequest;
use App\Http\Requests\TaskPositionRequest;
use App\Http\Resources\TaskCollection;
use App\Http\Resources\TaskResource;
use App\Http\Resources\SavedFilterResource;
use App\Models\Board;
use App\Models\Task;
use App\Models\TaskCustomValue;
use App\Models\SavedFilter;
use App\Services\FilterBuilder;
use App\Services\TaskFilterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Events\TaskDeleted;
use App\Events\TaskReordered;

class TaskController extends Controller
{
    /**
     * Task filter service instance
     *
     * @var TaskFilterService
     */
    protected TaskFilterService $taskFilterService;

    /**
     * Filter builder instance
     *
     * @var FilterBuilder
     */
    protected FilterBuilder $filterBuilder;

    /**
     * Constructor
     *
     * @param TaskFilterService $taskFilterService
     * @param FilterBuilder $filterBuilder
     */
    public function __construct(TaskFilterService $taskFilterService, FilterBuilder $filterBuilder)
    {
        $this->taskFilterService = $taskFilterService;
        $this->filterBuilder = $filterBuilder;
    }
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
     * Filter tasks in a board using GET request.
     */
    public function filter(TaskIndexWithFilterRequest $request, $tenantId, $workspaceId, $boardId): JsonResponse
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

        // Verify board exists
        $board = $workspace->boards()->find($boardId);
        if (!$board) {
            return response()->json(['error' => 'Board not found'], 404);
        }

        // Build the base query
        $query = Task::where('workspace_id', $workspaceId)
            ->where('tenant_id', $tenantId)
            ->where('board_id', $boardId);

        // Apply dynamic filters
        $filters = $request->getFilters();
        if (!empty($filters)) {
            $query = $this->taskFilterService->applyFilters($query, $board, $filters);
        }

        // Apply standard filters (search, status, etc.)
        $this->applyStandardFilters($query, $request);

        // Optimize query
        $query = $this->taskFilterService->optimizeQuery($query, $board);

        // Apply sorting
        $sortingParams = $request->getSortingParams();
        $query = $this->taskFilterService->applySorting($query, $board, $sortingParams['sort_by'], $sortingParams['sort_order']);

        // Include relationships
        $this->applyIncludes($query, $request->getIncludeParams());

        // Apply pagination
        $paginationParams = $request->getPaginationParams();
        if ($paginationParams['cursor']) {
            $tasks = $this->taskFilterService->applyCursorPagination($query, $paginationParams['per_page'], $paginationParams['cursor']);
        } else {
            $tasks = $this->taskFilterService->applyPagination($query, $paginationParams['per_page'], $paginationParams['page']);
        }

        // Handle filter saving
        if ($request->shouldSaveFilter()) {
            $this->saveCurrentFilter($request, $user, $board, $filters);
        }

        return response()->json([
            'data' => TaskFilterResource::collection($tasks),
            'meta' => [
                'filter_statistics' => $this->taskFilterService->getFilterStatistics($board, $filters),
                'available_columns' => $this->taskFilterService->getAvailableFilterColumns($board),
                'filter_validation' => $this->taskFilterService->validateFilterCombinations($filters),
            ],
        ]);
    }

    /**
     * Filter tasks in a board using POST request (advanced filtering).
     */
    public function filterAdvanced(TaskIndexWithFilterRequest $request, $tenantId, $workspaceId, $boardId): JsonResponse
    {
        // Same logic as GET filter method
        return $this->filter($request, $tenantId, $workspaceId, $boardId);
    }

    /**
     * Get saved filters for a board.
     */
    public function savedFilters(Request $request, $tenantId, $workspaceId, $boardId): JsonResponse
    {
        $user = Auth::user();
        
        // Verify user belongs to tenant and workspace
        $tenant = $user->tenants()->find($tenantId);
        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        $workspace = $tenant->workspaces()->find($workspaceId);
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found'], 404);
        }

        // Verify board exists
        $board = $workspace->boards()->find($boardId);
        if (!$board) {
            return response()->json(['error' => 'Board not found'], 404);
        }

        // Get saved filters
        $filters = SavedFilter::where('board_id', $boardId)
            ->accessibleBy($user)
            ->with(['user', 'board'])
            ->orderBy('is_default', 'desc')
            ->orderBy('name', 'asc')
            ->paginate(20);

        return SavedFilterResource::collection($filters);
    }

    /**
     * Save a filter for a board.
     */
    public function saveFilter(Request $request, $tenantId, $workspaceId, $boardId): JsonResponse
    {
        $user = Auth::user();
        
        // Verify user belongs to tenant and workspace
        $tenant = $user->tenants()->find($tenantId);
        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        $workspace = $tenant->workspaces()->find($workspaceId);
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found'], 404);
        }

        // Verify board exists
        $board = $workspace->boards()->find($boardId);
        if (!$board) {
            return response()->json(['error' => 'Board not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'filter_definition' => 'required|array',
            'is_public' => 'boolean',
            'is_default' => 'boolean',
        ]);

        return DB::transaction(function () use ($validated, $user, $board) {
            // If setting as default, remove default from other filters
            if ($validated['is_default'] ?? false) {
                SavedFilter::where('user_id', $user->id)
                    ->where('board_id', $board->id)
                    ->update(['is_default' => false]);
            }

            $savedFilter = SavedFilter::create([
                'user_id' => $user->id,
                'tenant_id' => $board->tenant_id,
                'board_id' => $board->id,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'filter_definition' => $validated['filter_definition'],
                'is_public' => $validated['is_public'] ?? false,
                'is_default' => $validated['is_default'] ?? false,
            ]);

            return new SavedFilterResource($savedFilter);
        });
    }

    /**
     * Delete a saved filter.
     */
    public function deleteFilter(Request $request, $tenantId, $workspaceId, $boardId, $filter): JsonResponse
    {
        $user = Auth::user();
        
        // Verify user belongs to tenant and workspace
        $tenant = $user->tenants()->find($tenantId);
        if (!$tenant) {
            return response()->json(['error' => 'Tenant not found'], 404);
        }

        $workspace = $tenant->workspaces()->find($workspaceId);
        if (!$workspace) {
            return response()->json(['error' => 'Workspace not found'], 404);
        }

        // Verify board exists
        $board = $workspace->boards()->find($boardId);
        if (!$board) {
            return response()->json(['error' => 'Board not found'], 404);
        }

        // Find and verify ownership of saved filter
        $savedFilter = SavedFilter::find($filter);
        if (!$savedFilter || !$savedFilter->isAccessibleBy($user)) {
            return response()->json(['error' => 'Saved filter not found or access denied'], 404);
        }

        $savedFilter->delete();

        return response()->json(['message' => 'Saved filter deleted successfully']);
    }

    /**
     * Apply standard filters to query
     *
     * @param Builder $query
     * @param TaskIndexWithFilterRequest $request
     */
    protected function applyStandardFilters($query, TaskIndexWithFilterRequest $request): void
    {
        $params = $request->getAllParams();

        // View-specific logic
        if (!empty($params['view'])) {
            if ($params['view'] === 'calendar' && !empty($params['start']) && !empty($params['end'])) {
                // Default to due_date for calendar, can be customized later or via explicit params
                $dateField = $params['date_field'] ?? 'due_date';
                
                if ($dateField === 'due_date') {
                     $query->whereDate('due_date', '>=', $params['start'])
                           ->whereDate('due_date', '<=', $params['end']);
                } elseif ($dateField === 'start_date') {
                     $query->whereDate('start_date', '>=', $params['start'])
                           ->whereDate('start_date', '<=', $params['end']);
                }
            }
        }

        // Apply search
        if (!empty($params['search'])) {
            $query->where(function ($query) use ($params) {
                $query->where('title', 'like', "%{$params['search']}%")
                      ->orWhere('description', 'like', "%{$params['search']}%");
            });
        }

        // Apply standard filters
        $query->when(!empty($params['status']), function ($query, $statuses) {
            $query->whereIn('status', $statuses);
        });

        $query->when(!empty($params['priority']), function ($query, $priorities) {
            $query->whereIn('priority', $priorities);
        });

        $query->when(!empty($params['assignee_id']), function ($query, $assigneeIds) {
            $query->whereIn('assignee_id', $assigneeIds);
        });

        $query->when(!empty($params['creator_id']), function ($query, $creatorIds) {
            $query->whereIn('creator_id', $creatorIds);
        });

        $query->when(!empty($params['due_date_from']), function ($query, $date) {
            $query->whereDate('due_date', '>=', $date);
        });

        $query->when(!empty($params['due_date_to']), function ($query, $date) {
            $query->whereDate('due_date', '<=', $date);
        });

        $query->when(!empty($params['start_date_from']), function ($query, $date) {
            $query->whereDate('start_date', '>=', $date);
        });

        $query->when(!empty($params['start_date_to']), function ($query, $date) {
            $query->whereDate('start_date', '<=', $date);
        });

        $query->when(!empty($params['created_at_from']), function ($query, $date) {
            $query->whereDate('created_at', '>=', $date);
        });

        $query->when(!empty($params['created_at_to']), function ($query, $date) {
            $query->whereDate('created_at', '<=', $date);
        });

        // Filter by labels
        $query->when(!empty($params['labels']), function ($query, $labelIds) {
            $query->whereHas('labels', function ($query) use ($labelIds) {
                $query->whereIn('labels.id', $labelIds);
            });
        });

        // Include archived or not
        if (!($params['include_archived'] ?? false)) {
            $query->whereNull('archived_at');
        }
    }

    /**
     * Apply includes to query
     *
     * @param Builder $query
     * @param array $includes
     */
    protected function applyIncludes($query, array $includes): void
    {
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
    }

    /**
     * Save current filter
     *
     * @param TaskIndexWithFilterRequest $request
     * @param User $user
     * @param Board $board
     * @param array $filters
     */
    protected function saveCurrentFilter(TaskIndexWithFilterRequest $request, $user, Board $board, array $filters): void
    {
        $saveParams = $request->getFilterSaveParams();
        
        if (!$saveParams['save_filter'] || empty($saveParams['filter_name'])) {
            return;
        }

        // If setting as default, remove default from other filters
        if ($saveParams['is_default'] ?? false) {
            SavedFilter::where('user_id', $user->id)
                ->where('board_id', $board->id)
                ->update(['is_default' => false]);
        }

        SavedFilter::updateOrCreate(
            [
                'user_id' => $user->id,
                'board_id' => $board->id,
                'name' => $saveParams['filter_name'],
            ],
            [
                'tenant_id' => $board->tenant_id,
                'description' => null,
                'filter_definition' => $filters,
                'is_public' => $saveParams['is_public'] ?? false,
                'is_default' => $saveParams['is_default'] ?? false,
            ]
        );
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

            $task->load(['labels', 'customValues', 'assignee', 'creator']);
            
            broadcast(new TaskCreated($task))->toOthers();

            return (new TaskResource($task))
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

            $task->fresh(['labels', 'customValues', 'assignee', 'creator']);
            
            broadcast(new TaskUpdated($task))->toOthers();

            return new TaskResource($task);
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

        $boardId = $task->board_id;
        $taskId = $task->id;
        $task->delete();

        broadcast(new TaskDeleted($taskId, $boardId))->toOthers();

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
        
        broadcast(new TaskUpdated($task))->toOthers();

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

        broadcast(new TaskUpdated($task))->toOthers();

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

            $newTask->load(['labels', 'customValues', 'assignee', 'creator']);
            
            broadcast(new TaskCreated($newTask))->toOthers();

            return (new TaskResource($newTask))
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

            $task->fresh();
            broadcast(new TaskUpdated($task))->toOthers();
            return new TaskResource($task);
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