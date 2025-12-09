<?php

namespace App\Listeners;

use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Events\TaskDeleted;
use App\Events\TaskAssigned;
use App\Services\ActivityService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class LogTaskActivity implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(object $event): void
    {
        match($event::class) {
            TaskCreated::class => $this->handleTaskCreated($event),
            TaskUpdated::class => $this->handleTaskUpdated($event),
            TaskDeleted::class => $this->handleTaskDeleted($event),
            TaskAssigned::class => $this->handleTaskAssigned($event),
            default => null,
        };
    }

    /**
     * Handle task created event.
     */
    protected function handleTaskCreated(TaskCreated $event): void
    {
        ActivityService::logCreated($event->task);
    }

    /**
     * Handle task updated event.
     */
    protected function handleTaskUpdated(TaskUpdated $event): void
    {
        $changes = [];

        // Get dirty attributes
        foreach ($event->task->getDirty() as $key => $value) {
            $old = $event->task->getOriginal($key);

            // Skip if values are the same
            if ($old === $value) {
                continue;
            }

            $changes[$key] = [
                'old' => $old,
                'new' => $value,
            ];
        }

        if (!empty($changes)) {
            ActivityService::logUpdated($event->task, $changes);
        }
    }

    /**
     * Handle task deleted event.
     */
    protected function handleTaskDeleted(TaskDeleted $event): void
    {
        ActivityService::logDeleted($event->task, $event->task->getOriginal());
    }

    /**
     * Handle task assigned event.
     */
    protected function handleTaskAssigned(TaskAssigned $event): void
    {
        ActivityService::logAssigned($event->task, $event->oldAssignee, $event->newAssignee);
    }
}
