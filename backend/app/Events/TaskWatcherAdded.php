<?php

namespace App\Events;

use App\Models\Task;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskWatcherAdded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The task instance.
     */
    public Task $task;

    /**
     * The user who was added as watcher.
     */
    public User $watcher;

    /**
     * Create a new event instance.
     */
    public function __construct(Task $task, User $watcher)
    {
        $this->task = $task;
        $this->watcher = $watcher;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];

        // Notify the new watcher
        $channels[] = new PrivateChannel('user.' . $this->watcher->id);

        // Notify task assignee
        if ($this->task->assignee) {
            $channels[] = new PrivateChannel('user.' . $this->task->assignee->id);
        }

        // Notify task creator
        if ($this->task->creator) {
            $channels[] = new PrivateChannel('user.' . $this->task->creator->id);
        }

        // Notify other watchers
        foreach ($this->task->watchers as $existingWatcher) {
            if ($existingWatcher->id !== $this->watcher->id) {
                $channels[] = new PrivateChannel('user.' . $existingWatcher->id);
            }
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'task.watcher.added';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'task' => [
                'id' => $this->task->id,
                'title' => $this->task->title,
            ],
            'watcher' => [
                'id' => $this->watcher->id,
                'name' => $this->watcher->name,
            ],
        ];
    }
}
