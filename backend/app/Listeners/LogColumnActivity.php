<?php

namespace App\Listeners;

use App\Events\ColumnCreated;
use App\Events\ColumnUpdated;
use App\Events\ColumnDeleted;
use App\Services\ActivityService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class LogColumnActivity implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(object $event): void
    {
        match($event::class) {
            ColumnCreated::class => $this->handleColumnCreated($event),
            ColumnUpdated::class => $this->handleColumnUpdated($event),
            ColumnDeleted::class => $this->handleColumnDeleted($event),
            default => null,
        };
    }

    /**
     * Handle column created event.
     */
    protected function handleColumnCreated(ColumnCreated $event): void
    {
        ActivityService::logCreated($event->column);
    }

    /**
     * Handle column updated event.
     */
    protected function handleColumnUpdated(ColumnUpdated $event): void
    {
        $changes = [];

        // Get dirty attributes
        foreach ($event->column->getDirty() as $key => $value) {
            $old = $event->column->getOriginal($key);

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
            ActivityService::logUpdated($event->column, $changes);
        }
    }

    /**
     * Handle column deleted event.
     */
    protected function handleColumnDeleted(ColumnDeleted $event): void
    {
        ActivityService::logDeleted($event->column, $event->column->getOriginal());
    }
}
