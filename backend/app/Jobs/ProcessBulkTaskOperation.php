<?php

namespace App\Jobs;

use App\Models\Task;
use App\Models\User;
use App\Services\TaskBulkOperationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Process Bulk Task Operation Job
 * 
 * This job handles bulk operations on tasks asynchronously to prevent
 * timeouts for large operations and improve user experience.
 */
class ProcessBulkTaskOperation implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public array $backoff = [10, 30, 60];

    /**
     * The maximum number of seconds the job can run.
     */
    public int $timeout = 300;

    /**
     * Create a new job instance.
     */
    public function __construct(
        private int $userId,
        private int $tenantId,
        private int $workspaceId,
        private string $operationType,
        private array $operationData
    ) {
        // Set the queue for this job
        $this->onQueue('bulk_operations');
    }

    /**
     * Execute the job.
     */
    public function handle(TaskBulkOperationService $bulkOperationService): void
    {
        Log::info('Starting bulk task operation', [
            'job_id' => $this->job->getJobId(),
            'user_id' => $this->userId,
            'tenant_id' => $this->tenantId,
            'workspace_id' => $this->workspaceId,
            'operation_type' => $this->operationType,
            'attempt' => $this->attempts(),
        ]);

        try {
            // Get the user who initiated the operation
            $user = User::find($this->userId);
            if (!$user) {
                Log::error('User not found for bulk operation', [
                    'job_id' => $this->job->getJobId(),
                    'user_id' => $this->userId,
                ]);
                return;
            }

            // Get the tasks for the operation
            $taskIds = $this->operationData['task_ids'];
            $tasks = Task::whereIn('id', $taskIds)
                ->where('tenant_id', $this->tenantId)
                ->where('workspace_id', $this->workspaceId)
                ->get();

            if ($tasks->count() !== count($taskIds)) {
                Log::warning('Some tasks not found for bulk operation', [
                    'job_id' => $this->job->getJobId(),
                    'requested_task_ids' => $taskIds,
                    'found_task_ids' => $tasks->pluck('id')->toArray(),
                ]);
            }

            // Execute the appropriate operation
            $result = match ($this->operationType) {
                'bulk_update' => $this->processBulkUpdate($tasks, $user, $bulkOperationService),
                'bulk_move' => $this->processBulkMove($tasks, $user, $bulkOperationService),
                'bulk_archive' => $this->processBulkArchive($tasks, $user, $bulkOperationService),
                'bulk_delete' => $this->processBulkDelete($tasks, $user, $bulkOperationService),
                'bulk_assign' => $this->processBulkAssign($tasks, $user, $bulkOperationService),
                'bulk_set_status' => $this->processBulkSetStatus($tasks, $user, $bulkOperationService),
                'bulk_set_priority' => $this->processBulkSetPriority($tasks, $user, $bulkOperationService),
                'bulk_add_labels' => $this->processBulkAddLabels($tasks, $user, $bulkOperationService),
                'bulk_remove_labels' => $this->processBulkRemoveLabels($tasks, $user, $bulkOperationService),
                'bulk_set_due_date' => $this->processBulkSetDueDate($tasks, $user, $bulkOperationService),
                default => throw new \InvalidArgumentException("Unknown operation type: {$this->operationType}")
            };

            Log::info('Bulk task operation completed successfully', [
                'job_id' => $this->job->getJobId(),
                'operation_type' => $this->operationType,
                'task_count' => $tasks->count(),
                'successful_count' => $result['successful_count'],
                'failed_count' => $result['failed_count'],
            ]);

            // Store operation result for potential retrieval
            $this->storeOperationResult($result);

        } catch (\Exception $e) {
            Log::error('Bulk task operation failed', [
                'job_id' => $this->job->getJobId(),
                'user_id' => $this->userId,
                'tenant_id' => $this->tenantId,
                'workspace_id' => $this->workspaceId,
                'operation_type' => $this->operationType,
                'attempt' => $this->attempts(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Re-throw the exception to trigger job retry
            throw $e;
        }
    }

    /**
     * Process bulk update operation.
     */
    protected function processBulkUpdate($tasks, User $user, TaskBulkOperationService $service): array
    {
        return DB::transaction(function () use ($tasks, $user, $service) {
            return $service->bulkUpdate($tasks, $this->operationData['updates'], $user);
        });
    }

    /**
     * Process bulk move operation.
     */
    protected function processBulkMove($tasks, User $user, TaskBulkOperationService $service): array
    {
        $targetBoardId = $this->operationData['target_board_id'];
        
        return DB::transaction(function () use ($tasks, $targetBoardId, $user, $service) {
            return $service->bulkMove($tasks, $targetBoardId, $user);
        });
    }

    /**
     * Process bulk archive operation.
     */
    protected function processBulkArchive($tasks, User $user, TaskBulkOperationService $service): array
    {
        return DB::transaction(function () use ($tasks, $user, $service) {
            return $service->bulkArchive($tasks, $user);
        });
    }

    /**
     * Process bulk delete operation.
     */
    protected function processBulkDelete($tasks, User $user, TaskBulkOperationService $service): array
    {
        return DB::transaction(function () use ($tasks, $user, $service) {
            return $service->bulkDelete($tasks, $user);
        });
    }

    /**
     * Process bulk assign operation.
     */
    protected function processBulkAssign($tasks, User $user, TaskBulkOperationService $service): array
    {
        $assigneeId = $this->operationData['assignee_id'];
        
        return DB::transaction(function () use ($tasks, $assigneeId, $user, $service) {
            return $service->bulkAssign($tasks, $assigneeId, $user);
        });
    }

    /**
     * Process bulk set status operation.
     */
    protected function processBulkSetStatus($tasks, User $user, TaskBulkOperationService $service): array
    {
        $status = $this->operationData['status'];
        
        return DB::transaction(function () use ($tasks, $status, $user, $service) {
            return $service->bulkSetStatus($tasks, $status, $user);
        });
    }

    /**
     * Process bulk set priority operation.
     */
    protected function processBulkSetPriority($tasks, User $user, TaskBulkOperationService $service): array
    {
        $priority = $this->operationData['priority'];
        
        return DB::transaction(function () use ($tasks, $priority, $user, $service) {
            return $service->bulkSetPriority($tasks, $priority, $user);
        });
    }

    /**
     * Process bulk add labels operation.
     */
    protected function processBulkAddLabels($tasks, User $user, TaskBulkOperationService $service): array
    {
        $labelIds = $this->operationData['label_ids'];
        
        return DB::transaction(function () use ($tasks, $labelIds, $user, $service) {
            return $service->bulkAddLabels($tasks, $labelIds, $user);
        });
    }

    /**
     * Process bulk remove labels operation.
     */
    protected function processBulkRemoveLabels($tasks, User $user, TaskBulkOperationService $service): array
    {
        $labelIds = $this->operationData['label_ids'];
        
        return DB::transaction(function () use ($tasks, $labelIds, $user, $service) {
            return $service->bulkRemoveLabels($tasks, $labelIds, $user);
        });
    }

    /**
     * Process bulk set due date operation.
     */
    protected function processBulkSetDueDate($tasks, User $user, TaskBulkOperationService $service): array
    {
        $dueDate = $this->operationData['due_date'];
        
        return DB::transaction(function () use ($tasks, $dueDate, $user, $service) {
            return $service->bulkSetDueDate($tasks, $dueDate, $user);
        });
    }

    /**
     * Store operation result for potential retrieval.
     * This could be stored in cache or database for status checking.
     */
    protected function storeOperationResult(array $result): void
    {
        // Store result in cache for 24 hours with job ID as key
        cache()->put(
            "bulk_operation_result_{$this->job->getJobId()}",
            [
                'operation_type' => $this->operationType,
                'user_id' => $this->userId,
                'tenant_id' => $this->tenantId,
                'workspace_id' => $this->workspaceId,
                'result' => $result,
                'completed_at' => now()->toISOString(),
            ],
            now()->addHours(24)
        );
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Exception $exception): void
    {
        Log::error('Bulk task operation job failed permanently', [
            'job_id' => $this->job->getJobId(),
            'user_id' => $this->userId,
            'tenant_id' => $this->tenantId,
            'workspace_id' => $this->workspaceId,
            'operation_type' => $this->operationType,
            'attempts' => $this->attempts(),
            'error' => $exception->getMessage(),
        ]);

        // Store failure information
        cache()->put(
            "bulk_operation_failure_{$this->job->getJobId()}",
            [
                'operation_type' => $this->operationType,
                'user_id' => $this->userId,
                'tenant_id' => $this->tenantId,
                'workspace_id' => $this->workspaceId,
                'error' => $exception->getMessage(),
                'failed_at' => now()->toISOString(),
            ],
            now()->addHours(24)
        );
    }
}