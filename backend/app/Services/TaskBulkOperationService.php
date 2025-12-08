<?php

namespace App\Services;

use App\Models\Board;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Task Bulk Operation Service
 * 
 * This service handles all bulk operations on tasks with proper
 * validation, authorization, and error handling.
 */
class TaskBulkOperationService
{
    /**
     * Bulk update multiple tasks.
     */
    public function bulkUpdate(Collection $tasks, array $updateData, User $user): array
    {
        $successfulTasks = collect();
        $failedTasks = collect();

        foreach ($tasks as $task) {
            try {
                // Update task with provided data
                $task->update($updateData);
                $successfulTasks->push($task);
                
                Log::info('Task updated successfully', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'update_data' => $updateData
                ]);
            } catch (\Exception $e) {
                $failedTasks->push([
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
                
                Log::error('Failed to update task', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'operation' => 'bulk_update',
            'successful_count' => $successfulTasks->count(),
            'failed_count' => $failedTasks->count(),
            'successful_tasks' => $successfulTasks,
            'failed_tasks' => $failedTasks,
        ];
    }

    /**
     * Bulk move tasks to another board.
     */
    public function bulkMove(Collection $tasks, int $targetBoardId, User $user): array
    {
        $targetBoard = Board::find($targetBoardId);
        if (!$targetBoard) {
            throw new \InvalidArgumentException('Target board not found');
        }

        $successfulTasks = collect();
        $failedTasks = collect();

        foreach ($tasks as $task) {
            try {
                // Update task board and recalculate position
                $task->board_id = $targetBoardId;
                $task->position = $this->getNextPosition($targetBoardId);
                $task->save();
                
                $successfulTasks->push($task);
                
                Log::info('Task moved successfully', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'from_board_id' => $task->getOriginal('board_id'),
                    'to_board_id' => $targetBoardId
                ]);
            } catch (\Exception $e) {
                $failedTasks->push([
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
                
                Log::error('Failed to move task', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'target_board_id' => $targetBoardId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'operation' => 'bulk_move',
            'successful_count' => $successfulTasks->count(),
            'failed_count' => $failedTasks->count(),
            'successful_tasks' => $successfulTasks,
            'failed_tasks' => $failedTasks,
            'target_board_id' => $targetBoardId,
        ];
    }

    /**
     * Bulk archive tasks.
     */
    public function bulkArchive(Collection $tasks, User $user): array
    {
        $successfulTasks = collect();
        $failedTasks = collect();

        foreach ($tasks as $task) {
            try {
                $task->archive();
                $successfulTasks->push($task);
                
                Log::info('Task archived successfully', [
                    'task_id' => $task->id,
                    'user_id' => $user->id
                ]);
            } catch (\Exception $e) {
                $failedTasks->push([
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
                
                Log::error('Failed to archive task', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'operation' => 'bulk_archive',
            'successful_count' => $successfulTasks->count(),
            'failed_count' => $failedTasks->count(),
            'successful_tasks' => $successfulTasks,
            'failed_tasks' => $failedTasks,
        ];
    }

    /**
     * Bulk delete tasks.
     */
    public function bulkDelete(Collection $tasks, User $user): array
    {
        $successfulTasks = collect();
        $failedTasks = collect();

        foreach ($tasks as $task) {
            try {
                $taskId = $task->id;
                $task->delete();
                $successfulTasks->push(['id' => $taskId, 'title' => $task->title]);
                
                Log::info('Task deleted successfully', [
                    'task_id' => $taskId,
                    'user_id' => $user->id
                ]);
            } catch (\Exception $e) {
                $failedTasks->push([
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
                
                Log::error('Failed to delete task', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'operation' => 'bulk_delete',
            'successful_count' => $successfulTasks->count(),
            'failed_count' => $failedTasks->count(),
            'successful_tasks' => $successfulTasks,
            'failed_tasks' => $failedTasks,
        ];
    }

    /**
     * Bulk assign tasks to users.
     */
    public function bulkAssign(Collection $tasks, ?int $assigneeId, User $user): array
    {
        $successfulTasks = collect();
        $failedTasks = collect();

        foreach ($tasks as $task) {
            try {
                $task->assignee_id = $assigneeId;
                $task->save();
                $successfulTasks->push($task);
                
                Log::info('Task assigned successfully', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'assignee_id' => $assigneeId
                ]);
            } catch (\Exception $e) {
                $failedTasks->push([
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
                
                Log::error('Failed to assign task', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'assignee_id' => $assigneeId,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'operation' => 'bulk_assign',
            'successful_count' => $successfulTasks->count(),
            'failed_count' => $failedTasks->count(),
            'successful_tasks' => $successfulTasks,
            'failed_tasks' => $failedTasks,
            'assignee_id' => $assigneeId,
        ];
    }

    /**
     * Bulk set status for tasks.
     */
    public function bulkSetStatus(Collection $tasks, string $status, User $user): array
    {
        $successfulTasks = collect();
        $failedTasks = collect();

        foreach ($tasks as $task) {
            try {
                $task->status = $status;
                
                // Set completed_at if status is 'done'
                if ($status === 'done') {
                    $task->completed_at = now();
                } else {
                    $task->completed_at = null;
                }
                
                $task->save();
                $successfulTasks->push($task);
                
                Log::info('Task status updated successfully', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'status' => $status
                ]);
            } catch (\Exception $e) {
                $failedTasks->push([
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
                
                Log::error('Failed to update task status', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'status' => $status,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'operation' => 'bulk_set_status',
            'successful_count' => $successfulTasks->count(),
            'failed_count' => $failedTasks->count(),
            'successful_tasks' => $successfulTasks,
            'failed_tasks' => $failedTasks,
            'status' => $status,
        ];
    }

    /**
     * Bulk set priority for tasks.
     */
    public function bulkSetPriority(Collection $tasks, string $priority, User $user): array
    {
        $successfulTasks = collect();
        $failedTasks = collect();

        foreach ($tasks as $task) {
            try {
                $task->priority = $priority;
                $task->save();
                $successfulTasks->push($task);
                
                Log::info('Task priority updated successfully', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'priority' => $priority
                ]);
            } catch (\Exception $e) {
                $failedTasks->push([
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
                
                Log::error('Failed to update task priority', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'priority' => $priority,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'operation' => 'bulk_set_priority',
            'successful_count' => $successfulTasks->count(),
            'failed_count' => $failedTasks->count(),
            'successful_tasks' => $successfulTasks,
            'failed_tasks' => $failedTasks,
            'priority' => $priority,
        ];
    }

    /**
     * Bulk add labels to tasks.
     */
    public function bulkAddLabels(Collection $tasks, array $labelIds, User $user): array
    {
        $successfulTasks = collect();
        $failedTasks = collect();

        foreach ($tasks as $task) {
            try {
                // Get current labels and add new ones without duplicates
                $currentLabelIds = $task->labels()->pluck('labels.id')->toArray();
                $newLabelIds = array_unique(array_merge($currentLabelIds, $labelIds));
                $task->labels()->sync($newLabelIds);
                
                $successfulTasks->push($task);
                
                Log::info('Labels added to task successfully', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'label_ids' => $labelIds
                ]);
            } catch (\Exception $e) {
                $failedTasks->push([
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
                
                Log::error('Failed to add labels to task', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'label_ids' => $labelIds,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'operation' => 'bulk_add_labels',
            'successful_count' => $successfulTasks->count(),
            'failed_count' => $failedTasks->count(),
            'successful_tasks' => $successfulTasks,
            'failed_tasks' => $failedTasks,
            'label_ids' => $labelIds,
        ];
    }

    /**
     * Bulk remove labels from tasks.
     */
    public function bulkRemoveLabels(Collection $tasks, array $labelIds, User $user): array
    {
        $successfulTasks = collect();
        $failedTasks = collect();

        foreach ($tasks as $task) {
            try {
                // Get current labels and remove specified ones
                $currentLabelIds = $task->labels()->pluck('labels.id')->toArray();
                $remainingLabelIds = array_diff($currentLabelIds, $labelIds);
                $task->labels()->sync($remainingLabelIds);
                
                $successfulTasks->push($task);
                
                Log::info('Labels removed from task successfully', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'label_ids' => $labelIds
                ]);
            } catch (\Exception $e) {
                $failedTasks->push([
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
                
                Log::error('Failed to remove labels from task', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'label_ids' => $labelIds,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'operation' => 'bulk_remove_labels',
            'successful_count' => $successfulTasks->count(),
            'failed_count' => $failedTasks->count(),
            'successful_tasks' => $successfulTasks,
            'failed_tasks' => $failedTasks,
            'label_ids' => $labelIds,
        ];
    }

    /**
     * Bulk set due date for tasks.
     */
    public function bulkSetDueDate(Collection $tasks, ?string $dueDate, User $user): array
    {
        $successfulTasks = collect();
        $failedTasks = collect();

        foreach ($tasks as $task) {
            try {
                $task->due_date = $dueDate ? date('Y-m-d H:i:s', strtotime($dueDate)) : null;
                $task->save();
                $successfulTasks->push($task);
                
                Log::info('Task due date updated successfully', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'due_date' => $dueDate
                ]);
            } catch (\Exception $e) {
                $failedTasks->push([
                    'task_id' => $task->id,
                    'error' => $e->getMessage()
                ]);
                
                Log::error('Failed to update task due date', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'due_date' => $dueDate,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return [
            'operation' => 'bulk_set_due_date',
            'successful_count' => $successfulTasks->count(),
            'failed_count' => $failedTasks->count(),
            'successful_tasks' => $successfulTasks,
            'failed_tasks' => $failedTasks,
            'due_date' => $dueDate,
        ];
    }

    /**
     * Get the next position for a new task in a board.
     */
    protected function getNextPosition(int $boardId): float
    {
        $lastTask = Task::where('board_id', $boardId)
            ->orderBy('position', 'desc')
            ->first();

        return $lastTask ? $lastTask->position + 1000 : 1000;
    }
}