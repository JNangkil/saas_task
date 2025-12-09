<?php

namespace App\Events;

use App\Models\TaskComment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentAdded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(public TaskComment $comment)
    {
        //
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // Broadcast to the board channel (or task channel if we had one, but spec says BoardChannel)
        // Usually we want to update the task UI, so board channel is appropriate if tasks are loaded in board.
        // Or specific task channel? Spec 2.1 says "BoardChannel (private channel per board)".
        // There is no TaskChannel in spec.
        // Need to load task to get board_id.
        return [
            new PrivateChannel('board.' . $this->comment->task->board_id),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'comment' => $this->comment->load('user'),
            'taskId' => $this->comment->task_id,
        ];
    }
}
