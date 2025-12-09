<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAssigned extends Notification
{
    use Queueable;

    /**
     * The task instance.
     */
    public Task $task;

    /**
     * The user who assigned the task (if different from the system).
     */
    public ?User $assignedBy;

    /**
     * Create a new notification instance.
     */
    public function __construct(Task $task, ?User $assignedBy = null)
    {
        $this->task = $task;
        $this->assignedBy = $assignedBy;
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
            ->subject(__('Task Assigned: :title', ['title' => $this->task->title]))
            ->greeting(__('Hello :name', ['name' => $notifiable->name]))
            ->line($this->assignedBy
                ? __(':assigner has assigned you to a new task.', ['assigner' => $this->assignedBy->name])
                : __('You have been assigned to a new task.')
            )
            ->line(__('Task: :title', ['title' => $this->task->title]))
            ->line($this->task->description ? __('Description: :description', ['description' => $this->task->description]) : '')
            ->action(__('View Task'), $url)
            ->line(__('Thank you for using our application!'));
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'task_assigned',
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'assigned_by' => $this->assignedBy ? [
                'id' => $this->assignedBy->id,
                'name' => $this->assignedBy->name,
            ] : null,
            'tenant_id' => $this->task->tenant_id,
            'workspace_id' => $this->task->workspace_id,
            'board_id' => $this->task->board_id,
        ];
    }
}