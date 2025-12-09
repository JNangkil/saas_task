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

class TaskAssigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * The task instance.
     */
    public Task $task;

    /**
     * The previous assignee.
     */
    public ?User $oldAssignee;

    /**
     * Create a new event instance.
     */
    public function __construct(Task $task, ?User $oldAssignee = null)
    {
        $this->task = $task;
        $this->oldAssignee = $oldAssignee;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];

        // Notify the new assignee
        if ($this->task->assignee) {
            $channels[] = new PrivateChannel('user.' . $this->task->assignee->id);
        }

        // Notify task watchers
        foreach ($this->task->watchers as $watcher) {
            $channels[] = new PrivateChannel('user.' . $watcher->id);
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'task.assigned';
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
                'assignee' => $this->task->assignee ? [
                    'id' => $this->task->assignee->id,
                    'name' => $this->task->assignee->name,
                ] : null,
            ],
            'old_assignee' => $this->oldAssignee ? [
                'id' => $this->oldAssignee->id,
                'name' => $this->oldAssignee->name,
            ] : null,
        ];
    }
}
