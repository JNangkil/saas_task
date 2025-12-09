<?php

namespace App\Traits;

use App\Services\ActivityService;
use Illuminate\Database\Eloquent\Model;

trait LogsActivity
{
    /**
     * Indicates if the model should log activities.
     */
    protected bool $logActivities = true;

    /**
     * The attributes to log when changed.
     */
    protected array $loggableAttributes = ['*'];

    /**
     * The attributes to ignore when logging.
     */
    protected array $logIgnoredAttributes = [
        'id',
        'created_at',
        'updated_at',
        'deleted_at',
        'password',
        'remember_token',
    ];

    /**
     * Boot the trait.
     */
    protected static function bootLogsActivity(): void
    {
        if (method_exists(static::class, 'created')) {
            static::created(function (Model $model) {
                if (!$model->shouldLogActivity()) {
                    return;
                }

                ActivityService::logCreated($model);
            });
        }

        if (method_exists(static::class, 'updated')) {
            static::updated(function (Model $model) {
                if (!$model->shouldLogActivity()) {
                    return;
                }

                $changes = $model->getActivityChanges();
                if (!empty($changes)) {
                    ActivityService::logUpdated($model, $changes);
                }
            });
        }

        if (method_exists(static::class, 'deleted')) {
            static::deleted(function (Model $model) {
                if (!$model->shouldLogActivity()) {
                    return;
                }

                ActivityService::logDeleted($model, $model->getOriginal());
            });
        }
    }

    /**
     * Determine if the model should log activities.
     */
    protected function shouldLogActivity(): bool
    {
        if (!$this->logActivities) {
            return false;
        }

        // Check if we're running in a console command
        if (app()->runningInConsole()) {
            return false;
        }

        // Check if user is authenticated
        if (!auth()->check()) {
            return false;
        }

        return true;
    }

    /**
     * Get the attributes that should be logged.
     */
    protected function getLoggableAttributes(): array
    {
        if (in_array('*', $this->loggableAttributes)) {
            return array_diff(
                array_keys($this->getAttributes()),
                $this->logIgnoredAttributes
            );
        }

        return $this->loggableAttributes;
    }

    /**
     * Get the changes that should be logged.
     */
    protected function getActivityChanges(): array
    {
        $loggable = $this->getLoggableAttributes();
        $changes = [];

        foreach ($this->getDirty() as $key => $value) {
            if (!in_array($key, $loggable)) {
                continue;
            }

            $old = $this->getOriginal($key);
            $new = $value;

            // Skip if values are the same
            if ($old === $new) {
                continue;
            }

            // Format timestamps
            if (in_array($key, ['created_at', 'updated_at', 'deleted_at'])) {
                $old = $old ? $old->toDateTimeString() : null;
                $new = $new ? $new->toDateTimeString() : null;
            }

            // Format JSON fields
            if (is_array($old) || is_array($new)) {
                $old = $old ? json_encode($old) : null;
                $new = $new ? json_encode($new) : null;
            }

            $changes[$key] = [
                'old' => $old,
                'new' => $new,
            ];
        }

        return $changes;
    }

    /**
     * Get the description for the activity log.
     */
    public function getActivityDescription(): string
    {
        if (method_exists($this, 'getNameAttribute')) {
            return $this->name;
        }

        if (isset($this->name)) {
            return $this->name;
        }

        if (isset($this->title)) {
            return $this->title;
        }

        if (isset($this->subject)) {
            return $this->subject;
        }

        return class_basename($this) . " #{$this->id}";
    }

    /**
     * Disable activity logging for this model instance.
     */
    public function disableActivityLogging(): static
    {
        $this->logActivities = false;

        return $this;
    }

    /**
     * Enable activity logging for this model instance.
     */
    public function enableActivityLogging(): static
    {
        $this->logActivities = true;

        return $this;
    }

    /**
     * Set the attributes that should be logged.
     */
    public function setLoggableAttributes(array $attributes): static
    {
        $this->loggableAttributes = $attributes;

        return $this;
    }

    /**
     * Add an attribute to the ignore list.
     */
    public function ignoreActivityAttribute(string $attribute): static
    {
        $this->logIgnoredAttributes[] = $attribute;

        return $this;
    }

    /**
     * Log a custom activity.
     */
    public function logActivity(string $action, ?string $description = null, ?array $changes = null, ?array $metadata = null): void
    {
        if (!$this->shouldLogActivity()) {
            return;
        }

        ActivityService::log($action, $this, $description, $changes, $metadata);
    }
}