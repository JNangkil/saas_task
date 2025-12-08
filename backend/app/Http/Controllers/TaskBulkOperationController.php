<?php

namespace App\Http\Controllers;

use App\Http\Requests\TaskBulkAssignRequest;
use App\Http\Requests\TaskBulkArchiveRequest;
use App\Http\Requests\TaskBulkDeleteRequest;
use App\Http\Requests\TaskBulkManageLabelsRequest;
use App\Http\Requests\TaskBulkMoveRequest;
use App\Http\Requests\TaskBulkSetDueDateRequest;
use App\Http\Requests\TaskBulkSetPriorityRequest;
use App\Http\Requests\TaskBulkSetStatusRequest;
use App\Http\Requests\TaskBulkUpdateRequest;
use App\Http\Resources\TaskBulkOperationResource;
use App\Http\Resources\TaskBulkOperationResultResource;
use App\Jobs\ProcessBulkTaskOperation;
use App\Models\Task;
use App\Services\TaskBulkOperationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TaskBulkOperationController extends Controller
{
    /**
     * The task bulk operation service instance.
     */
    protected TaskBulkOperationService $bulkOperationService;

    /**
     * Create a new controller instance.
     */
    public function __construct(TaskBulkOperationService $bulkOperationService)
    {
        $this->bulkOperationService = $bulkOperationService;
    }

    /**
     * Bulk update multiple tasks.
     */
    public function bulkUpdate(TaskBulkUpdateRequest $request, $tenantId, $workspaceId): JsonResponse
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

        $validated = $request->validated();
        $taskIds = $validated['task_ids'];
        $updateData = $validated['updates'];
        $async = $validated['async'] ?? false;

        // Validate that all tasks exist and belong to the user's tenant/workspace
        $tasks = Task::whereIn('id', $taskIds)
            ->where('tenant_id', $tenantId)
            ->where('workspace_id', $workspaceId)
            ->get();

        if ($tasks->count() !== count($taskIds)) {
            return response()->json([
                'error' => 'One or more tasks not found or do not belong to this workspace',
                'invalid_task_ids' => array_diff($taskIds, $tasks->pluck('id')->toArray())
            ], 404);
        }

        // Check authorization for all tasks
        foreach ($tasks as $task) {
            $this->authorize('update', $task);
        }

        if ($async && $tasks->count() > 10) {
            // Process asynchronously for large operations
            $job = new ProcessBulkTaskOperation(
                $user->id,
                $tenantId,
                $workspaceId,
                'bulk_update',
                [
                    'task_ids' => $taskIds,
                    'updates' => $updateData
                ]
            );
            
            dispatch($job->onQueue('bulk_operations'));

            return response()->json([
                'message' => 'Bulk update operation queued for processing',
                'job_id' => $job->getJobId(),
                'task_count' => count($taskIds)
            ], 202);
        }

        // Process synchronously
        try {
            $result = $this->bulkOperationService->bulkUpdate($tasks, $updateData, $user);
            
            Log::info('Bulk update completed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'task_count' => count($taskIds),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count']
            ]);

            return new TaskBulkOperationResultResource($result);
        } catch (\Exception $e) {
            Log::error('Bulk update failed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Bulk update operation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk move tasks to another board.
     */
    public function bulkMove(TaskBulkMoveRequest $request, $tenantId, $workspaceId): JsonResponse
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

        $validated = $request->validated();
        $taskIds = $validated['task_ids'];
        $targetBoardId = $validated['target_board_id'];
        $async = $validated['async'] ?? false;

        // Validate target board exists and belongs to workspace
        $targetBoard = $workspace->boards()->find($targetBoardId);
        if (!$targetBoard) {
            return response()->json(['error' => 'Target board not found'], 404);
        }

        // Validate that all tasks exist and belong to the user's tenant/workspace
        $tasks = Task::whereIn('id', $taskIds)
            ->where('tenant_id', $tenantId)
            ->where('workspace_id', $workspaceId)
            ->get();

        if ($tasks->count() !== count($taskIds)) {
            return response()->json([
                'error' => 'One or more tasks not found or do not belong to this workspace',
                'invalid_task_ids' => array_diff($taskIds, $tasks->pluck('id')->toArray())
            ], 404);
        }

        // Check authorization for all tasks
        foreach ($tasks as $task) {
            $this->authorize('update', $task);
        }

        if ($async && $tasks->count() > 10) {
            // Process asynchronously for large operations
            $job = new ProcessBulkTaskOperation(
                $user->id,
                $tenantId,
                $workspaceId,
                'bulk_move',
                [
                    'task_ids' => $taskIds,
                    'target_board_id' => $targetBoardId
                ]
            );
            
            dispatch($job->onQueue('bulk_operations'));

            return response()->json([
                'message' => 'Bulk move operation queued for processing',
                'job_id' => $job->getJobId(),
                'task_count' => count($taskIds)
            ], 202);
        }

        // Process synchronously
        try {
            $result = $this->bulkOperationService->bulkMove($tasks, $targetBoard, $user);
            
            Log::info('Bulk move completed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'target_board_id' => $targetBoardId,
                'task_count' => count($taskIds),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count']
            ]);

            return new TaskBulkOperationResultResource($result);
        } catch (\Exception $e) {
            Log::error('Bulk move failed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'target_board_id' => $targetBoardId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Bulk move operation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk archive tasks.
     */
    public function bulkArchive(TaskBulkArchiveRequest $request, $tenantId, $workspaceId): JsonResponse
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

        $validated = $request->validated();
        $taskIds = $validated['task_ids'];
        $async = $validated['async'] ?? false;

        // Validate that all tasks exist and belong to the user's tenant/workspace
        $tasks = Task::whereIn('id', $taskIds)
            ->where('tenant_id', $tenantId)
            ->where('workspace_id', $workspaceId)
            ->get();

        if ($tasks->count() !== count($taskIds)) {
            return response()->json([
                'error' => 'One or more tasks not found or do not belong to this workspace',
                'invalid_task_ids' => array_diff($taskIds, $tasks->pluck('id')->toArray())
            ], 404);
        }

        // Check authorization for all tasks
        foreach ($tasks as $task) {
            $this->authorize('archive', $task);
        }

        if ($async && $tasks->count() > 10) {
            // Process asynchronously for large operations
            $job = new ProcessBulkTaskOperation(
                $user->id,
                $tenantId,
                $workspaceId,
                'bulk_archive',
                [
                    'task_ids' => $taskIds
                ]
            );
            
            dispatch($job->onQueue('bulk_operations'));

            return response()->json([
                'message' => 'Bulk archive operation queued for processing',
                'job_id' => $job->getJobId(),
                'task_count' => count($taskIds)
            ], 202);
        }

        // Process synchronously
        try {
            $result = $this->bulkOperationService->bulkArchive($tasks, $user);
            
            Log::info('Bulk archive completed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'task_count' => count($taskIds),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count']
            ]);

            return new TaskBulkOperationResultResource($result);
        } catch (\Exception $e) {
            Log::error('Bulk archive failed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Bulk archive operation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk delete tasks.
     */
    public function bulkDelete(TaskBulkDeleteRequest $request, $tenantId, $workspaceId): JsonResponse
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

        $validated = $request->validated();
        $taskIds = $validated['task_ids'];
        $async = $validated['async'] ?? false;

        // Validate that all tasks exist and belong to the user's tenant/workspace
        $tasks = Task::whereIn('id', $taskIds)
            ->where('tenant_id', $tenantId)
            ->where('workspace_id', $workspaceId)
            ->get();

        if ($tasks->count() !== count($taskIds)) {
            return response()->json([
                'error' => 'One or more tasks not found or do not belong to this workspace',
                'invalid_task_ids' => array_diff($taskIds, $tasks->pluck('id')->toArray())
            ], 404);
        }

        // Check authorization for all tasks
        foreach ($tasks as $task) {
            $this->authorize('delete', $task);
        }

        if ($async && $tasks->count() > 10) {
            // Process asynchronously for large operations
            $job = new ProcessBulkTaskOperation(
                $user->id,
                $tenantId,
                $workspaceId,
                'bulk_delete',
                [
                    'task_ids' => $taskIds
                ]
            );
            
            dispatch($job->onQueue('bulk_operations'));

            return response()->json([
                'message' => 'Bulk delete operation queued for processing',
                'job_id' => $job->getJobId(),
                'task_count' => count($taskIds)
            ], 202);
        }

        // Process synchronously
        try {
            $result = $this->bulkOperationService->bulkDelete($tasks, $user);
            
            Log::info('Bulk delete completed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'task_count' => count($taskIds),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count']
            ]);

            return new TaskBulkOperationResultResource($result);
        } catch (\Exception $e) {
            Log::error('Bulk delete failed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Bulk delete operation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk assign tasks to users.
     */
    public function bulkAssign(TaskBulkAssignRequest $request, $tenantId, $workspaceId): JsonResponse
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

        $validated = $request->validated();
        $taskIds = $validated['task_ids'];
        $assigneeId = $validated['assignee_id'];
        $async = $validated['async'] ?? false;

        // Validate assignee belongs to workspace
        if ($assigneeId && !$workspace->users()->where('users.id', $assigneeId)->exists()) {
            return response()->json(['error' => 'Assignee does not belong to this workspace'], 404);
        }

        // Validate that all tasks exist and belong to the user's tenant/workspace
        $tasks = Task::whereIn('id', $taskIds)
            ->where('tenant_id', $tenantId)
            ->where('workspace_id', $workspaceId)
            ->get();

        if ($tasks->count() !== count($taskIds)) {
            return response()->json([
                'error' => 'One or more tasks not found or do not belong to this workspace',
                'invalid_task_ids' => array_diff($taskIds, $tasks->pluck('id')->toArray())
            ], 404);
        }

        // Check authorization for all tasks
        foreach ($tasks as $task) {
            $this->authorize('update', $task);
        }

        if ($async && $tasks->count() > 10) {
            // Process asynchronously for large operations
            $job = new ProcessBulkTaskOperation(
                $user->id,
                $tenantId,
                $workspaceId,
                'bulk_assign',
                [
                    'task_ids' => $taskIds,
                    'assignee_id' => $assigneeId
                ]
            );
            
            dispatch($job->onQueue('bulk_operations'));

            return response()->json([
                'message' => 'Bulk assign operation queued for processing',
                'job_id' => $job->getJobId(),
                'task_count' => count($taskIds)
            ], 202);
        }

        // Process synchronously
        try {
            $result = $this->bulkOperationService->bulkAssign($tasks, $assigneeId, $user);
            
            Log::info('Bulk assign completed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'assignee_id' => $assigneeId,
                'task_count' => count($taskIds),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count']
            ]);

            return new TaskBulkOperationResultResource($result);
        } catch (\Exception $e) {
            Log::error('Bulk assign failed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'assignee_id' => $assigneeId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Bulk assign operation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk set status for tasks.
     */
    public function bulkSetStatus(TaskBulkSetStatusRequest $request, $tenantId, $workspaceId): JsonResponse
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

        $validated = $request->validated();
        $taskIds = $validated['task_ids'];
        $status = $validated['status'];
        $async = $validated['async'] ?? false;

        // Validate that all tasks exist and belong to the user's tenant/workspace
        $tasks = Task::whereIn('id', $taskIds)
            ->where('tenant_id', $tenantId)
            ->where('workspace_id', $workspaceId)
            ->get();

        if ($tasks->count() !== count($taskIds)) {
            return response()->json([
                'error' => 'One or more tasks not found or do not belong to this workspace',
                'invalid_task_ids' => array_diff($taskIds, $tasks->pluck('id')->toArray())
            ], 404);
        }

        // Check authorization for all tasks
        foreach ($tasks as $task) {
            $this->authorize('update', $task);
        }

        if ($async && $tasks->count() > 10) {
            // Process asynchronously for large operations
            $job = new ProcessBulkTaskOperation(
                $user->id,
                $tenantId,
                $workspaceId,
                'bulk_set_status',
                [
                    'task_ids' => $taskIds,
                    'status' => $status
                ]
            );
            
            dispatch($job->onQueue('bulk_operations'));

            return response()->json([
                'message' => 'Bulk set status operation queued for processing',
                'job_id' => $job->getJobId(),
                'task_count' => count($taskIds)
            ], 202);
        }

        // Process synchronously
        try {
            $result = $this->bulkOperationService->bulkSetStatus($tasks, $status, $user);
            
            Log::info('Bulk set status completed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'status' => $status,
                'task_count' => count($taskIds),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count']
            ]);

            return new TaskBulkOperationResultResource($result);
        } catch (\Exception $e) {
            Log::error('Bulk set status failed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'status' => $status,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Bulk set status operation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk set priority for tasks.
     */
    public function bulkSetPriority(TaskBulkSetPriorityRequest $request, $tenantId, $workspaceId): JsonResponse
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

        $validated = $request->validated();
        $taskIds = $validated['task_ids'];
        $priority = $validated['priority'];
        $async = $validated['async'] ?? false;

        // Validate that all tasks exist and belong to the user's tenant/workspace
        $tasks = Task::whereIn('id', $taskIds)
            ->where('tenant_id', $tenantId)
            ->where('workspace_id', $workspaceId)
            ->get();

        if ($tasks->count() !== count($taskIds)) {
            return response()->json([
                'error' => 'One or more tasks not found or do not belong to this workspace',
                'invalid_task_ids' => array_diff($taskIds, $tasks->pluck('id')->toArray())
            ], 404);
        }

        // Check authorization for all tasks
        foreach ($tasks as $task) {
            $this->authorize('update', $task);
        }

        if ($async && $tasks->count() > 10) {
            // Process asynchronously for large operations
            $job = new ProcessBulkTaskOperation(
                $user->id,
                $tenantId,
                $workspaceId,
                'bulk_set_priority',
                [
                    'task_ids' => $taskIds,
                    'priority' => $priority
                ]
            );
            
            dispatch($job->onQueue('bulk_operations'));

            return response()->json([
                'message' => 'Bulk set priority operation queued for processing',
                'job_id' => $job->getJobId(),
                'task_count' => count($taskIds)
            ], 202);
        }

        // Process synchronously
        try {
            $result = $this->bulkOperationService->bulkSetPriority($tasks, $priority, $user);
            
            Log::info('Bulk set priority completed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'priority' => $priority,
                'task_count' => count($taskIds),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count']
            ]);

            return new TaskBulkOperationResultResource($result);
        } catch (\Exception $e) {
            Log::error('Bulk set priority failed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'priority' => $priority,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Bulk set priority operation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk add labels to tasks.
     */
    public function bulkAddLabels(TaskBulkManageLabelsRequest $request, $tenantId, $workspaceId): JsonResponse
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

        $validated = $request->validated();
        $taskIds = $validated['task_ids'];
        $labelIds = $validated['label_ids'];
        $async = $validated['async'] ?? false;

        // Validate that all labels exist and belong to the workspace
        $workspaceLabelIds = $workspace->labels()->pluck('labels.id')->toArray();
        $invalidLabelIds = array_diff($labelIds, $workspaceLabelIds);
        
        if (!empty($invalidLabelIds)) {
            return response()->json([
                'error' => 'One or more labels do not belong to this workspace',
                'invalid_label_ids' => $invalidLabelIds
            ], 404);
        }

        // Validate that all tasks exist and belong to the user's tenant/workspace
        $tasks = Task::whereIn('id', $taskIds)
            ->where('tenant_id', $tenantId)
            ->where('workspace_id', $workspaceId)
            ->get();

        if ($tasks->count() !== count($taskIds)) {
            return response()->json([
                'error' => 'One or more tasks not found or do not belong to this workspace',
                'invalid_task_ids' => array_diff($taskIds, $tasks->pluck('id')->toArray())
            ], 404);
        }

        // Check authorization for all tasks
        foreach ($tasks as $task) {
            $this->authorize('manageLabels', $task);
        }

        if ($async && $tasks->count() > 10) {
            // Process asynchronously for large operations
            $job = new ProcessBulkTaskOperation(
                $user->id,
                $tenantId,
                $workspaceId,
                'bulk_add_labels',
                [
                    'task_ids' => $taskIds,
                    'label_ids' => $labelIds
                ]
            );
            
            dispatch($job->onQueue('bulk_operations'));

            return response()->json([
                'message' => 'Bulk add labels operation queued for processing',
                'job_id' => $job->getJobId(),
                'task_count' => count($taskIds)
            ], 202);
        }

        // Process synchronously
        try {
            $result = $this->bulkOperationService->bulkAddLabels($tasks, $labelIds, $user);
            
            Log::info('Bulk add labels completed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'label_ids' => $labelIds,
                'task_count' => count($taskIds),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count']
            ]);

            return new TaskBulkOperationResultResource($result);
        } catch (\Exception $e) {
            Log::error('Bulk add labels failed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'label_ids' => $labelIds,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Bulk add labels operation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk remove labels from tasks.
     */
    public function bulkRemoveLabels(TaskBulkManageLabelsRequest $request, $tenantId, $workspaceId): JsonResponse
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

        $validated = $request->validated();
        $taskIds = $validated['task_ids'];
        $labelIds = $validated['label_ids'];
        $async = $validated['async'] ?? false;

        // Validate that all labels exist and belong to the workspace
        $workspaceLabelIds = $workspace->labels()->pluck('labels.id')->toArray();
        $invalidLabelIds = array_diff($labelIds, $workspaceLabelIds);
        
        if (!empty($invalidLabelIds)) {
            return response()->json([
                'error' => 'One or more labels do not belong to this workspace',
                'invalid_label_ids' => $invalidLabelIds
            ], 404);
        }

        // Validate that all tasks exist and belong to the user's tenant/workspace
        $tasks = Task::whereIn('id', $taskIds)
            ->where('tenant_id', $tenantId)
            ->where('workspace_id', $workspaceId)
            ->get();

        if ($tasks->count() !== count($taskIds)) {
            return response()->json([
                'error' => 'One or more tasks not found or do not belong to this workspace',
                'invalid_task_ids' => array_diff($taskIds, $tasks->pluck('id')->toArray())
            ], 404);
        }

        // Check authorization for all tasks
        foreach ($tasks as $task) {
            $this->authorize('manageLabels', $task);
        }

        if ($async && $tasks->count() > 10) {
            // Process asynchronously for large operations
            $job = new ProcessBulkTaskOperation(
                $user->id,
                $tenantId,
                $workspaceId,
                'bulk_remove_labels',
                [
                    'task_ids' => $taskIds,
                    'label_ids' => $labelIds
                ]
            );
            
            dispatch($job->onQueue('bulk_operations'));

            return response()->json([
                'message' => 'Bulk remove labels operation queued for processing',
                'job_id' => $job->getJobId(),
                'task_count' => count($taskIds)
            ], 202);
        }

        // Process synchronously
        try {
            $result = $this->bulkOperationService->bulkRemoveLabels($tasks, $labelIds, $user);
            
            Log::info('Bulk remove labels completed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'label_ids' => $labelIds,
                'task_count' => count($taskIds),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count']
            ]);

            return new TaskBulkOperationResultResource($result);
        } catch (\Exception $e) {
            Log::error('Bulk remove labels failed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'label_ids' => $labelIds,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Bulk remove labels operation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk set due date for tasks.
     */
    public function bulkSetDueDate(TaskBulkSetDueDateRequest $request, $tenantId, $workspaceId): JsonResponse
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

        $validated = $request->validated();
        $taskIds = $validated['task_ids'];
        $dueDate = $validated['due_date'];
        $async = $validated['async'] ?? false;

        // Validate that all tasks exist and belong to the user's tenant/workspace
        $tasks = Task::whereIn('id', $taskIds)
            ->where('tenant_id', $tenantId)
            ->where('workspace_id', $workspaceId)
            ->get();

        if ($tasks->count() !== count($taskIds)) {
            return response()->json([
                'error' => 'One or more tasks not found or do not belong to this workspace',
                'invalid_task_ids' => array_diff($taskIds, $tasks->pluck('id')->toArray())
            ], 404);
        }

        // Check authorization for all tasks
        foreach ($tasks as $task) {
            $this->authorize('update', $task);
        }

        if ($async && $tasks->count() > 10) {
            // Process asynchronously for large operations
            $job = new ProcessBulkTaskOperation(
                $user->id,
                $tenantId,
                $workspaceId,
                'bulk_set_due_date',
                [
                    'task_ids' => $taskIds,
                    'due_date' => $dueDate
                ]
            );
            
            dispatch($job->onQueue('bulk_operations'));

            return response()->json([
                'message' => 'Bulk set due date operation queued for processing',
                'job_id' => $job->getJobId(),
                'task_count' => count($taskIds)
            ], 202);
        }

        // Process synchronously
        try {
            $result = $this->bulkOperationService->bulkSetDueDate($tasks, $dueDate, $user);
            
            Log::info('Bulk set due date completed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'due_date' => $dueDate,
                'task_count' => count($taskIds),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count']
            ]);

            return new TaskBulkOperationResultResource($result);
        } catch (\Exception $e) {
            Log::error('Bulk set due date failed', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'workspace_id' => $workspaceId,
                'due_date' => $dueDate,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Bulk set due date operation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}