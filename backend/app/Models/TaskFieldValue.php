<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskFieldValue extends Model
{
    use HasFactory, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'task_id',
        'board_column_id',
        'value',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the task that owns the field value.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the board column that owns the field value.
     */
    public function boardColumn(): BelongsTo
    {
        return $this->belongsTo(BoardColumn::class);
    }

    /**
     * Scope a query to only include values for a specific task.
     */
    public function scopeForTask($query, $taskId)
    {
        return $query->where('task_id', $taskId);
    }

    /**
     * Scope a query to only include values for a specific column.
     */
    public function scopeForColumn($query, $columnId)
    {
        return $query->where('board_column_id', $columnId);
    }

    /**
     * Scope a query to only include values for a specific column type.
     */
    public function scopeForColumnType($query, $type)
    {
        return $query->whereHas('boardColumn', function ($q) use ($type) {
            $q->where('type', $type);
        });
    }

    /**
     * Get the typed value based on the column type.
     */
    public function getTypedValue(): mixed
    {
        if (!$this->boardColumn) {
            return $this->value;
        }

        return match ($this->boardColumn->type) {
            'text', 'textarea', 'email', 'url', 'select' => is_array($this->value) ? implode(', ', $this->value) : $this->value,
            'number' => is_numeric($this->value) ? (float) $this->value : 0,
            'date', 'datetime' => $this->value ? now()->parse($this->value) : null,
            'boolean', 'checkbox' => (bool) $this->value,
            'multiselect' => is_array($this->value) ? $this->value : [],
            'file' => $this->value,
            default => $this->value,
        };
    }

    /**
     * Set the value with proper type casting.
     */
    public function setTypedValue(mixed $value): void
    {
        if (!$this->boardColumn) {
            $this->value = $value;
            return;
        }

        $this->value = match ($this->boardColumn->type) {
            'text', 'textarea', 'email', 'url', 'select' => (string) $value,
            'number' => is_numeric($value) ? (float) $value : 0,
            'date', 'datetime' => $value ? now()->parse($value)->toDateTimeString() : null,
            'boolean', 'checkbox' => (bool) $value,
            'multiselect' => is_array($value) ? $value : [$value],
            'file' => $value,
            default => $value,
        };
    }

    /**
     * Get the display value for the field.
     */
    public function getDisplayValue(): string
    {
        $value = $this->getTypedValue();

        if (!$this->boardColumn) {
            return is_array($value) ? json_encode($value) : (string) $value;
        }

        return match ($this->boardColumn->type) {
            'boolean', 'checkbox' => $value ? 'Yes' : 'No',
            'date' => $value ? $value->format('Y-m-d') : '',
            'datetime' => $value ? $value->format('Y-m-d H:i:s') : '',
            'multiselect' => is_array($value) ? implode(', ', $value) : (string) $value,
            'file' => is_array($value) && isset($value['name']) ? $value['name'] : (string) $value,
            default => is_array($value) ? json_encode($value) : (string) $value,
        };
    }

    /**
     * Validate the value against the column rules.
     */
    public function validateValue(): bool
    {
        if (!$this->boardColumn) {
            return false;
        }

        $value = $this->getTypedValue();
        $rules = $this->boardColumn->getValidationRules();

        // Simple validation - in a real app, you'd use Laravel's validator
        if ($this->boardColumn->is_required && (is_null($value) || $value === '')) {
            return false;
        }

        return match ($this->boardColumn->type) {
            'email' => filter_var($value, FILTER_VALIDATE_EMAIL) !== false,
            'url' => filter_var($value, FILTER_VALIDATE_URL) !== false,
            'number' => is_numeric($value),
            'date' => !is_null($value) && strtotime($value) !== false,
            'datetime' => !is_null($value) && strtotime($value) !== false,
            'select' => in_array($value, $this->boardColumn->options ?? []),
            'multiselect' => !is_null($value) && is_array($value) && empty(array_diff($value, $this->boardColumn->options ?? [])),
            default => true,
        };
    }

    /**
     * Get the validation error message.
     */
    public function getValidationErrorMessage(): string
    {
        if (!$this->boardColumn) {
            return 'Invalid column configuration';
        }

        $value = $this->getTypedValue();

        if ($this->boardColumn->is_required && (is_null($value) || $value === '')) {
            return "The {$this->boardColumn->name} field is required.";
        }

        return match ($this->boardColumn->type) {
            'email' => 'Please enter a valid email address.',
            'url' => 'Please enter a valid URL.',
            'number' => 'Please enter a valid number.',
            'date' => 'Please enter a valid date.',
            'datetime' => 'Please enter a valid date and time.',
            'select' => 'Please select a valid option.',
            'multiselect' => 'Please select valid options.',
            default => 'Invalid value',
        };
    }
}