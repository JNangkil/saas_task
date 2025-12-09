<?php

namespace App\Providers;

use App\Events\TaskAssigned;
use App\Events\TaskWatcherAdded;
use App\Events\TaskCreated;
use App\Events\TaskUpdated;
use App\Events\TaskDeleted;
use App\Events\CommentAdded;
use App\Events\CommentUpdated;
use App\Events\CommentDeleted;
use App\Events\ColumnCreated;
use App\Events\ColumnUpdated;
use App\Events\ColumnDeleted;
use App\Listeners\SendTaskAssignedNotification;
use App\Listeners\SendTaskWatcherAddedNotification;
use App\Listeners\LogTaskActivity;
use App\Listeners\LogCommentActivity;
use App\Listeners\LogColumnActivity;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],

        TaskAssigned::class => [
            SendTaskAssignedNotification::class,
        ],

        TaskWatcherAdded::class => [
            SendTaskWatcherAddedNotification::class,
        ],

        // Task activity logging
        TaskCreated::class => [
            LogTaskActivity::class,
        ],

        TaskUpdated::class => [
            LogTaskActivity::class,
        ],

        TaskDeleted::class => [
            LogTaskActivity::class,
        ],

        // Comment activity logging
        CommentAdded::class => [
            LogCommentActivity::class,
        ],

        CommentUpdated::class => [
            LogCommentActivity::class,
        ],

        CommentDeleted::class => [
            LogCommentActivity::class,
        ],

        // Column activity logging
        ColumnCreated::class => [
            LogColumnActivity::class,
        ],

        ColumnUpdated::class => [
            LogColumnActivity::class,
        ],

        ColumnDeleted::class => [
            LogColumnActivity::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}