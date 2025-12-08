<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavedFilter extends Model
{
    use HasFactory, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'board_id',
        'name',
        'description',
        'filter_definition',
        'is_public',
        'is_default',
        'usage_count',
        'last_used_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'filter_definition' => 'array',
            'is_public' => 'boolean',
            'is_default' => 'boolean',
            'usage_count' => 'integer',
            'last_used_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the saved filter.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the board that owns the saved filter.
     */
    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    /**
     * Get the filter shares for this saved filter.
     */
    public function shares(): HasMany
    {
        return $this->hasMany(SavedFilterShare::class);
    }

    /**
     * Scope a query to only include filters for a specific user.
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope a query to only include filters for a specific board.
     */
    public function scopeForBoard($query, $boardId)
    {
        return $query->where('board_id', $boardId);
    }

    /**
     * Scope a query to only include public filters.
     */
    public function scopePublic($query)
    {
        return $query->where('is_public', true);
    }

    /**
     * Scope a query to only include private filters.
     */
    public function scopePrivate($query)
    {
        return $query->where('is_public', false);
    }

    /**
     * Scope a query to only include default filters.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope a query to only include non-default filters.
     */
    public function scopeNotDefault($query)
    {
        return $query->where('is_default', false);
    }

    /**
     * Scope a query to order by most recently used.
     */
    public function scopeRecentlyUsed($query)
    {
        return $query->orderBy('last_used_at', 'desc');
    }

    /**
     * Scope a query to order by most frequently used.
     */
    public function scopeFrequentlyUsed($query)
    {
        return $query->orderBy('usage_count', 'desc');
    }

    /**
     * Scope a query to include filters accessible to a user.
     */
    public function scopeAccessibleBy($query, $user)
    {
        return $query->where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('is_public', true);
        });
    }

    /**
     * Check if the filter is accessible to a user.
     */
    public function isAccessibleBy($user): bool
    {
        return $this->user_id === $user->id || $this->is_public;
    }

    /**
     * Increment the usage count and update last used timestamp.
     */
    public function recordUsage(): void
    {
        $this->increment('usage_count');
        $this->update(['last_used_at' => now()]);
    }

    /**
     * Make the filter public.
     */
    public function makePublic(): void
    {
        $this->update(['is_public' => true]);
    }

    /**
     * Make the filter private.
     */
    public function makePrivate(): void
    {
        $this->update(['is_public' => false]);
    }

    /**
     * Set as default filter.
     */
    public function setAsDefault(): void
    {
        // Remove default status from other filters for this user and board
        static::where('user_id', $this->user_id)
            ->where('board_id', $this->board_id)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);

        // Set this filter as default
        $this->update(['is_default' => true]);
    }

    /**
     * Remove default status.
     */
    public function removeDefault(): void
    {
        $this->update(['is_default' => false]);
    }

    /**
     * Get the filter summary for display.
     */
    public function getSummary(): string
    {
        if (empty($this->filter_definition)) {
            return 'No filters applied';
        }

        $filterCount = is_array($this->filter_definition) ? count($this->filter_definition) : 0;
        return "{$filterCount} filter" . ($filterCount !== 1 ? 's' : '');
    }

    /**
     * Get the filter definition as JSON string.
     */
    public function getFilterDefinitionJson(): string
    {
        return json_encode($this->filter_definition, JSON_PRETTY_PRINT);
    }

    /**
     * Set the filter definition from JSON string.
     */
    public function setFilterDefinitionFromJson(string $json): void
    {
        $this->filter_definition = json_decode($json, true);
    }

    /**
     * Duplicate the filter for the same user.
     */
    public function duplicate(string $newName): self
    {
        $duplicate = $this->replicate();
        $duplicate->name = $newName;
        $duplicate->is_default = false;
        $duplicate->usage_count = 0;
        $duplicate->last_used_at = null;
        $duplicate->save();

        return $duplicate;
    }

    /**
     * Share the filter with another user.
     */
    public function shareWith($userId, $permissions = ['view', 'use']): void
    {
        $this->shares()->updateOrCreate(
            ['user_id' => $userId],
            ['permissions' => $permissions]
        );
    }

    /**
     * Revoke sharing from a user.
     */
    public function revokeShareFrom($userId): void
    {
        $this->shares()->where('user_id', $userId)->delete();
    }

    /**
     * Check if the filter is shared with a user.
     */
    public function isSharedWith($userId): bool
    {
        return $this->shares()->where('user_id', $userId)->exists();
    }

    /**
     * Get the sharing permissions for a user.
     */
    public function getSharingPermissionsFor($userId): array
    {
        $share = $this->shares()->where('user_id', $userId)->first();
        return $share ? $share->permissions : [];
    }

    /**
     * Get the filter statistics.
     */
    public function getStatistics(): array
    {
        return [
            'usage_count' => $this->usage_count,
            'last_used_at' => $this->last_used_at,
            'created_at' => $this->created_at,
            'days_since_creation' => $this->created_at->diffInDays(now()),
            'days_since_last_use' => $this->last_used_at ? $this->last_used_at->diffInDays(now()) : null,
            'is_public' => $this->is_public,
            'is_default' => $this->is_default,
            'filter_count' => is_array($this->filter_definition) ? count($this->filter_definition) : 0,
        ];
    }

    /**
     * Get the cache key for this filter.
     */
    public function getCacheKey(): string
    {
        return "saved_filter_{$this->id}_{$this->updated_at->timestamp}";
    }

    /**
     * Get the validation rules for the filter definition.
     */
    public function getFilterValidationRules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'filter_definition' => 'required|array',
            'is_public' => 'boolean',
            'is_default' => 'boolean',
        ];
    }

    /**
     * Get the validation messages for the filter definition.
     */
    public function getFilterValidationMessages(): array
    {
        return [
            'name.required' => 'Filter name is required',
            'name.max' => 'Filter name may not be greater than 255 characters',
            'description.max' => 'Description may not be greater than 1000 characters',
            'filter_definition.required' => 'Filter definition is required',
            'filter_definition.array' => 'Filter definition must be an array',
        ];
    }
}