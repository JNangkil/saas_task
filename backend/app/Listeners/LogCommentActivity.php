<?php

namespace App\Listeners;

use App\Events\CommentAdded;
use App\Events\CommentUpdated;
use App\Events\CommentDeleted;
use App\Services\ActivityService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class LogCommentActivity implements ShouldQueue
{
    use InteractsWithQueue;

    /**
     * Handle the event.
     */
    public function handle(object $event): void
    {
        match($event::class) {
            CommentAdded::class => $this->handleCommentAdded($event),
            CommentUpdated::class => $this->handleCommentUpdated($event),
            CommentDeleted::class => $this->handleCommentDeleted($event),
            default => null,
        };
    }

    /**
     * Handle comment added event.
     */
    protected function handleCommentAdded(CommentAdded $event): void
    {
        ActivityService::logCommented(
            $event->comment->commentable,
            $event->comment->content,
            ['comment_id' => $event->comment->id]
        );
    }

    /**
     * Handle comment updated event.
     */
    protected function handleCommentUpdated(CommentUpdated $event): void
    {
        $changes = [
            'content' => [
                'old' => $event->comment->getOriginal('content'),
                'new' => $event->comment->content,
            ]
        ];

        ActivityService::logUpdated(
            $event->comment,
            $changes,
            "updated comment on " . class_basename($event->comment->commentable),
            ['comment_id' => $event->comment->id]
        );
    }

    /**
     * Handle comment deleted event.
     */
    protected function handleCommentDeleted(CommentDeleted $event): void
    {
        ActivityService::log(
            'deleted',
            $event->comment,
            "deleted comment from " . class_basename($event->comment->commentable),
            null,
            ['comment_id' => $event->comment->id]
        );
    }
}
