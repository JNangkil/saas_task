<?php

namespace App\Services;

use App\Models\User;
use App\Models\Task;
use App\Models\UserNotificationPreference;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;

class NotificationService
{
    /**
     * Notification types
     */
    public const TASK_ASSIGNED = 'task_assigned';
    public const MENTION_IN_COMMENT = 'mention_in_comment';
    public const TASK_DUE_SOON = 'task_due_soon';
    public const TASK_OVERDUE = 'task_overdue';
    public const TASK_COMPLETED = 'task_completed';
    public const TASK_UPDATED = 'task_updated';
    public const WORKSPACE_INVITATION = 'workspace_invitation';

    /**
     * Send a notification to a user.
     */
    public function sendNotification(User $user, string $type, array $data): void
    {
        // Check user preferences
        $preference = $user->notificationPreference ?? $user->notificationPreference()->create([
            'preferences' => UserNotificationPreference::getDefaultPreferences()
        ]);

        // Prepare notification data
        $notificationData = $this->prepareNotificationData($type, $data);

        // Send in-app notification if enabled
        if ($preference->isEnabled($type, 'in_app')) {
            $this->sendInAppNotification($user, $type, $notificationData);
        }

        // Send email notification if enabled
        if ($preference->isEnabled($type, 'email')) {
            $this->sendEmailNotification($user, $type, $notificationData);
        }
    }

    /**
     * Send a task assignment notification.
     */
    public function sendTaskAssignedNotification(User $user, Task $task): void
    {
        $this->sendNotification($user, self::TASK_ASSIGNED, [
            'title' => 'New Task Assigned',
            'body' => "You have been assigned to task: {$task->title}",
            'action_url' => "/tasks/{$task->id}",
            'icon' => 'assignment',
            'color' => 'blue',
            'task_id' => $task->id,
            'assigned_by' => auth()->user()->name ?? 'System',
        ]);
    }

    /**
     * Send a mention in comment notification.
     */
    public function sendMentionInCommentNotification(User $user, Task $task, string $comment, User $mentionedBy): void
    {
        $this->sendNotification($user, self::MENTION_IN_COMMENT, [
            'title' => 'Mentioned in Comment',
            'body' => "{$mentionedBy->name} mentioned you in a comment on {$task->title}",
            'action_url' => "/tasks/{$task->id}",
            'icon' => 'at-symbol',
            'color' => 'purple',
            'task_id' => $task->id,
            'comment_preview' => substr($comment, 0, 100),
            'mentioned_by' => $mentionedBy->name,
        ]);
    }

    /**
     * Send a task due soon notification.
     */
    public function sendTaskDueSoonNotification(User $user, Task $task): void
    {
        $dueDate = $task->due_date->format('M j, Y');
        $this->sendNotification($user, self::TASK_DUE_SOON, [
            'title' => 'Task Due Soon',
            'body' => "Task '{$task->title}' is due on {$dueDate}",
            'action_url' => "/tasks/{$task->id}",
            'icon' => 'clock',
            'color' => 'yellow',
            'task_id' => $task->id,
            'due_date' => $dueDate,
        ]);
    }

    /**
     * Send a task overdue notification.
     */
    public function sendTaskOverdueNotification(User $user, Task $task): void
    {
        $dueDate = $task->due_date->format('M j, Y');
        $this->sendNotification($user, self::TASK_OVERDUE, [
            'title' => 'Task Overdue',
            'body' => "Task '{$task->title}' was due on {$dueDate}",
            'action_url' => "/tasks/{$task->id}",
            'icon' => 'exclamation-circle',
            'color' => 'red',
            'task_id' => $task->id,
            'due_date' => $dueDate,
        ]);
    }

    /**
     * Send a task completed notification.
     */
    public function sendTaskCompletedNotification(User $user, Task $task, User $completedBy): void
    {
        $this->sendNotification($user, self::TASK_COMPLETED, [
            'title' => 'Task Completed',
            'body' => "{$completedBy->name} completed task: {$task->title}",
            'action_url' => "/tasks/{$task->id}",
            'icon' => 'check-circle',
            'color' => 'green',
            'task_id' => $task->id,
            'completed_by' => $completedBy->name,
        ]);
    }

    /**
     * Send a task updated notification.
     */
    public function sendTaskUpdatedNotification(User $user, Task $task, User $updatedBy): void
    {
        $this->sendNotification($user, self::TASK_UPDATED, [
            'title' => 'Task Updated',
            'body' => "{$updatedBy->name} updated task: {$task->title}",
            'action_url' => "/tasks/{$task->id}",
            'icon' => 'pencil',
            'color' => 'gray',
            'task_id' => $task->id,
            'updated_by' => $updatedBy->name,
        ]);
    }

    /**
     * Send a workspace invitation notification.
     */
    public function sendWorkspaceInvitationNotification(string $email, string $workspaceName): void
    {
        $notificationData = [
            'title' => 'Workspace Invitation',
            'body' => "You've been invited to join workspace: {$workspaceName}",
            'action_url' => "/invitations/accept",
            'icon' => 'mail',
            'color' => 'indigo',
            'workspace_name' => $workspaceName,
        ];

        // Send email to external user
        Notification::route('mail', $email)
            ->notify(new \App\Notifications\WorkspaceInvitation($notificationData));
    }

    /**
     * Send an in-app notification.
     */
    private function sendInAppNotification(User $user, string $type, array $data): void
    {
        $notification = new \App\Notifications\InAppNotification($type, $data);
        $user->notify($notification);
    }

    /**
     * Send an email notification.
     */
    private function sendEmailNotification(User $user, string $type, array $data): void
    {
        switch ($type) {
            case self::TASK_ASSIGNED:
                $user->notify(new \App\Notifications\TaskAssigned($data));
                break;
            case self::MENTION_IN_COMMENT:
                $user->notify(new \App\Notifications\MentionInComment($data));
                break;
            case self::TASK_DUE_SOON:
                $user->notify(new \App\Notifications\TaskDueSoon($data));
                break;
            case self::TASK_OVERDUE:
                $user->notify(new \App\Notifications\TaskOverdue($data));
                break;
        }
    }

    /**
     * Prepare notification data with defaults.
     */
    private function prepareNotificationData(string $type, array $data): array
    {
        $defaults = [
            'type' => $type,
            'created_at' => now()->toISOString(),
        ];

        return array_merge($defaults, $data);
    }
}