<?php

namespace App\Jobs;

use App\Models\Task;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class DueDateReminderJob implements ShouldQueue
{
    use Queueable;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    /**
     * Execute the job.
     */
    public function handle(NotificationService $notificationService): void
    {
        // Get tasks due in the next 24 hours
        $tomorrow = Carbon::tomorrow()->endOfDay();
        $today = Carbon::now()->startOfDay();

        $tasksDueSoon = Task::with(['assignee'])
            ->whereNotNull('due_date')
            ->where('due_date', '<=', $tomorrow)
            ->where('due_date', '>=', $today)
            ->whereHas('assignee')
            ->whereDoesntHave('notifications', function ($query) {
                $query->where('type', 'task_due_soon')
                    ->where('created_at', '>=', Carbon::now()->subDay());
            })
            ->get();

        foreach ($tasksDueSoon as $task) {
            try {
                if ($task->due_date->isToday()) {
                    // Task is due today
                    $notificationService->sendTaskDueSoonNotification($task->assignee, $task);
                } else {
                    // Task is due tomorrow
                    $notificationService->sendTaskDueSoonNotification($task->assignee, $task);
                }
            } catch (\Exception $e) {
                Log::error('Failed to send due date reminder for task ' . $task->id, [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Get overdue tasks
        $overdueTasks = Task::with(['assignee'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', $today)
            ->whereHas('assignee')
            ->whereDoesntHave('notifications', function ($query) {
                $query->where('type', 'task_overdue')
                    ->where('created_at', '>=', Carbon::now()->subDay());
            })
            ->get();

        foreach ($overdueTasks as $task) {
            try {
                $notificationService->sendTaskOverdueNotification($task->assignee, $task);
            } catch (\Exception $e) {
                Log::error('Failed to send overdue notification for task ' . $task->id, [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('Due date reminders processed', [
            'tasks_due_soon' => $tasksDueSoon->count(),
            'overdue_tasks' => $overdueTasks->count(),
        ]);
    }
}
