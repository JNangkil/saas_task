<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskCustomValue extends Model
{
    use HasFactory, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'task_id',
        'field_name',
        'field_type',
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
     * Get the task that owns the custom value.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Scope a query to only include values for a specific field.
     */
    public function scopeForField($query, $fieldName)
    {
        return $query->where('field_name', $fieldName);
    }

    /**
     * Scope a query to only include values of a specific type.
     */
    public function scopeOfType($query, $fieldType)
    {
        return $query->where('field_type', $fieldType);
    }

    /**
     * Get the typed value based on field_type.
     */
    public function getTypedValueAttribute()
    {
        return match($this->field_type) {
            'text' => is_array($this->value) ? implode(' ', $this->value) : $this->value,
            'number' => is_array($this->value) ? (float) ($this->value[0] ?? 0) : (float) $this->value,
            'date' => is_array($this->value) ? $this->value[0] : $this->value,
            'select' => $this->value,
            default => $this->value,
        };
    }
}