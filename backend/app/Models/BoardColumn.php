<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BoardColumn extends Model
{
    use HasFactory, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'board_id',
        'name',
        'type',
        'position',
        'width',
        'is_pinned',
        'is_required',
        'options',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'is_required' => 'boolean',
            'options' => 'array',
            'position' => 'decimal:4',
            'width' => 'decimal:4',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the board that owns the column.
     */
    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    /**
     * Get the task field values for the column.
     */
    public function taskFieldValues(): HasMany
    {
        return $this->hasMany(TaskFieldValue::class);
    }

    /**
     * Scope a query to only include columns of a specific type.
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope a query to only include pinned columns.
     */
    public function scopePinned($query)
    {
        return $query->where('is_pinned', true);
    }

    /**
     * Scope a query to only include required columns.
     */
    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }

    /**
     * Scope a query to order columns by position.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('position');
    }

    /**
     * Check if the column is of a specific type.
     */
    public function isType(string $type): bool
    {
        return $this->type === $type;
    }

    /**
     * Check if the column supports multiple values.
     */
    public function supportsMultipleValues(): bool
    {
        return in_array($this->type, ['select', 'multiselect', 'checkbox']);
    }

    /**
     * Get the default value for the column type.
     */
    public function getDefaultValue(): mixed
    {
        return match ($this->type) {
            'text', 'textarea', 'email', 'url' => '',
            'number' => 0,
            'date', 'datetime' => null,
            'boolean', 'checkbox' => false,
            'select' => null,
            'multiselect' => [],
            'file' => null,
            default => null,
        };
    }

    /**
     * Get the validation rules for the column type.
     */
    public function getValidationRules(): array
    {
        $rules = match ($this->type) {
            'text' => ['string', 'max:255'],
            'textarea' => ['string'],
            'email' => ['email', 'max:255'],
            'url' => ['url', 'max:255'],
            'number' => ['numeric'],
            'date' => ['date'],
            'datetime' => ['date'],
            'boolean' => ['boolean'],
            'checkbox' => ['boolean'],
            'select' => ['string'],
            'multiselect' => ['array'],
            'file' => ['file', 'max:10240'], // 10MB max
            default => ['string'],
        };

        if ($this->is_required) {
            $rules[] = 'required';
        } else {
            $rules[] = 'nullable';
        }

        return $rules;
    }

    /**
     * Pin the column.
     */
    public function pin(): void
    {
        $this->is_pinned = true;
        $this->save();
    }

    /**
     * Unpin the column.
     */
    public function unpin(): void
    {
        $this->is_pinned = false;
        $this->save();
    }

    /**
     * Make the column required.
     */
    public function makeRequired(): void
    {
        $this->is_required = true;
        $this->save();
    }

    /**
     * Make the column optional.
     */
    public function makeOptional(): void
    {
        $this->is_required = false;
        $this->save();
    }
}