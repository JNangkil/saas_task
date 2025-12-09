<?php

namespace App\Listeners;

use App\Events\TaskWatcherAdded;
use App\Notifications\TaskWatcherAdded as TaskWatcherAddedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Notification;

class SendTaskWatcherAddedNotification implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(TaskWatcherAdded $event): void
    {
        // Send notification to the newly added watcher
        Notification::send(
            $event->watcher,
            new TaskWatcherAddedNotification($event->task, auth()->user())
        );
    }
}