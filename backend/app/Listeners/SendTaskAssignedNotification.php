<?php

namespace App\Listeners;

use App\Events\TaskAssigned;
use App\Notifications\TaskAssigned as TaskAssignedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Notification;

class SendTaskAssignedNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(TaskAssigned $event): void
    {
        // Send notification to the new assignee if they exist
        if ($event->task->assignee) {
            Notification::send(
                $event->task->assignee,
                new TaskAssignedNotification($event->task, auth()->user())
            );
        }
    }
}