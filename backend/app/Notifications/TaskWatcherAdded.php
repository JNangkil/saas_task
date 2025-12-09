<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskWatcherAdded extends Notification
{
    use Queueable;

    /**
     * The task instance.
     */
    public Task $task;

    /**
     * The user who added the watcher.
     */
    public ?User $addedBy;

    /**
     * Create a new notification instance.
     */
    public function __construct(Task $task, ?User $addedBy = null)
    {
        $this->task = $task;
        $this->addedBy = $addedBy;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $url = config('app.frontend_url') . "/tasks/{$this->task->id}";

        return (new MailMessage)
            ->subject(__('You are now watching: :title', ['title' => $this->task->title]))
            ->greeting(__('Hello :name', ['name' => $notifiable->name]))
            ->line($this->addedBy
                ? __(':adder has added you as a watcher to this task.', ['adder' => $this->addedBy->name])
                : __('You have been added as a watcher to this task.')
            )
            ->line(__('Task: :title', ['title' => $this->task->title]))
            ->line($this->task->description ? __('Description: :description', ['description' => $this->task->description]) : '')
            ->action(__('View Task'), $url)
            ->line(__('You will receive notifications for updates to this task.'));
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'task_watcher_added',
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'added_by' => $this->addedBy ? [
                'id' => $this->addedBy->id,
                'name' => $this->addedBy->name,
            ] : null,
            'tenant_id' => $this->task->tenant_id,
            'workspace_id' => $this->task->workspace_id,
            'board_id' => $this->task->board_id,
        ];
    }
}