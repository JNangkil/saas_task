<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class ActivityService
{
    /**
     * Action types
     */
    const ACTION_CREATED = 'created';
    const ACTION_UPDATED = 'updated';
    const ACTION_DELETED = 'deleted';
    const ACTION_ASSIGNED = 'assigned';
    const ACTION_UNASSIGNED = 'unassigned';
    const ACTION_COMMENTED = 'commented';
    const ACTION_ATTACHED = 'attached';
    const ACTION_DETACHED = 'detached';
    const ACTION_MOVED = 'moved';
    const ACTION_COPIED = 'copied';
    const ACTION_REORDERED = 'reordered';
    const ACTION_ARCHIVED = 'archived';
    const ACTION_RESTORED = 'restored';

    /**
     * Log an activity.
     */
    public static function log(string $action, Model $subject, ?string $description = null, ?array $changes = null, ?array $metadata = null): ActivityLog
    {
        $user = Auth::user();

        $activity = new ActivityLog([
            'user_id' => $user?->id,
            'tenant_id' => self::getTenantId($subject),
            'workspace_id' => self::getWorkspaceId($subject),
            'subject_type' => get_class($subject),
            'subject_id' => $subject->id,
            'action' => $action,
            'description' => $description,
            'changes' => $changes,
            'metadata' => array_merge($metadata ?? [], [
                'ip_address' => request()?->ip(),
                'user_agent' => request()?->userAgent(),
            ]),
        ]);

        $activity->save();

        return $activity;
    }

    /**
     * Log creation of a model.
     */
    public static function logCreated(Model $subject, ?string $description = null, ?array $metadata = null): ActivityLog
    {
        $description = $description ?: self::generateDescription(self::ACTION_CREATED, $subject);

        return self::log(self::ACTION_CREATED, $subject, $description, null, $metadata);
    }

    /**
     * Log update of a model.
     */
    public static function logUpdated(Model $subject, array $changes, ?string $description = null, ?array $metadata = null): ActivityLog
    {
        $description = $description ?: self::generateDescription(self::ACTION_UPDATED, $subject, $changes);

        return self::log(self::ACTION_UPDATED, $subject, $description, $changes, $metadata);
    }

    /**
     * Log deletion of a model.
     */
    public static function logDeleted(Model $subject, ?array $originalAttributes = null, ?string $description = null, ?array $metadata = null): ActivityLog
    {
        $description = $description ?: self::generateDescription(self::ACTION_DELETED, $subject, $originalAttributes);

        // Store original attributes as changes for deleted items
        $changes = $originalAttributes ? ['original' => $originalAttributes] : null;

        return self::log(self::ACTION_DELETED, $subject, $description, $changes, $metadata);
    }

    /**
     * Log assignment changes.
     */
    public static function logAssigned(Model $subject, ?Model $oldAssignee = null, ?Model $newAssignee = null, ?array $metadata = null): ActivityLog
    {
        $changes = [];
        $description = '';

        if ($oldAssignee && !$newAssignee) {
            $action = self::ACTION_UNASSIGNED;
            $changes = ['old' => $oldAssignee->toArray()];
            $description = "unassigned {$oldAssignee->name} from";
        } elseif (!$oldAssignee && $newAssignee) {
            $action = self::ACTION_ASSIGNED;
            $changes = ['new' => $newAssignee->toArray()];
            $description = "assigned to {$newAssignee->name}";
        } elseif ($oldAssignee && $newAssignee) {
            $action = self::ACTION_ASSIGNED;
            $changes = ['old' => $oldAssignee->toArray(), 'new' => $newAssignee->toArray()];
            $description = "reassigned from {$oldAssignee->name} to {$newAssignee->name}";
        } else {
            return null;
        }

        return self::log($action, $subject, $description, $changes, $metadata);
    }

    /**
     * Log comment addition.
     */
    public static function logCommented(Model $subject, string $comment, ?array $metadata = null): ActivityLog
    {
        $description = "commented: \"" . str_limit($comment, 100) . "\"";

        return self::log(self::ACTION_COMMENTED, $subject, $description, ['comment' => $comment], $metadata);
    }

    /**
     * Log file attachment.
     */
    public static function logAttached(Model $subject, string $filename, ?array $metadata = null): ActivityLog
    {
        $description = "attached file: {$filename}";

        return self::log(self::ACTION_ATTACHED, $subject, $description, ['filename' => $filename], $metadata);
    }

    /**
     * Generate human-readable description based on action and subject.
     */
    private static function generateDescription(string $action, Model $subject, ?array $changes = null): string
    {
        $subjectType = class_basename($subject);
        $subjectName = self::getSubjectName($subject);

        return match($action) {
            self::ACTION_CREATED => "created {$subjectType}: {$subjectName}",
            self::ACTION_UPDATED => self::generateUpdateDescription($subjectType, $subjectName, $changes),
            self::ACTION_DELETED => "deleted {$subjectType}: {$subjectName}",
            self::ACTION_ARCHIVED => "archived {$subjectType}: {$subjectName}",
            self::ACTION_RESTORED => "restored {$subjectType}: {$subjectName}",
            self::ACTION_MOVED => "moved {$subjectType}: {$subjectName}",
            self::ACTION_COPIED => "copied {$subjectType}: {$subjectName}",
            self::ACTION_REORDERED => "reordered {$subjectType}: {$subjectName}",
            default => "{$action} {$subjectType}: {$subjectName}",
        };
    }

    /**
     * Generate update description with changed fields.
     */
    private static function generateUpdateDescription(string $subjectType, string $subjectName, ?array $changes = null): string
    {
        if (!$changes) {
            return "updated {$subjectType}: {$subjectName}";
        }

        $changedFields = array_keys($changes);

        if (count($changedFields) === 1) {
            $field = $changedFields[0];
            return "updated {$subjectType} {$field}: {$subjectName}";
        }

        if (count($changedFields) <= 3) {
            $fields = implode(', ', $changedFields);
            return "updated {$subjectType} fields ({$fields}): {$subjectName}";
        }

        return "updated {$subjectType}: {$subjectName}";
    }

    /**
     * Get a display name for the subject.
     */
    private static function getSubjectName(Model $subject): string
    {
        // Try common name attributes
        if (isset($subject->name)) {
            return $subject->name;
        }

        if (isset($subject->title)) {
            return $subject->title;
        }

        if (isset($subject->subject)) {
            return $subject->subject;
        }

        // Fallback to model type with ID
        return class_basename($subject) . " #{$subject->id}";
    }

    /**
     * Get tenant ID from subject or current context.
     */
    private static function getTenantId(Model $subject): ?int
    {
        if (isset($subject->tenant_id)) {
            return $subject->tenant_id;
        }

        if (method_exists($subject, 'getTenantId')) {
            return $subject->getTenantId();
        }

        if (method_exists($subject, 'workspace') && $subject->workspace) {
            return $subject->workspace->tenant_id;
        }

        return tenant()?->id;
    }

    /**
     * Get workspace ID from subject or current context.
     */
    private static function getWorkspaceId(Model $subject): ?int
    {
        if (isset($subject->workspace_id)) {
            return $subject->workspace_id;
        }

        if (method_exists($subject, 'getWorkspaceId')) {
            return $subject->getWorkspaceId();
        }

        if (method_exists($subject, 'workspace')) {
            return $subject->workspace?->id;
        }

        return null;
    }

    /**
     * Clean up old activity logs based on retention policy.
     */
    public static function cleanup(int $daysToKeep = 90): int
    {
        $cutoffDate = now()->subDays($daysToKeep);

        return ActivityLog::where('created_at', '<', $cutoffDate)->delete();
    }
}