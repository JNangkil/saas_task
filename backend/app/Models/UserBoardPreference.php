<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserBoardPreference extends Model
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
        'column_preferences',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'column_preferences' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    /**
     * Get the user that owns the preference.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the board that owns the preference.
     */
    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    /**
     * Scope a query to only include preferences for a specific user.
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope a query to only include preferences for a specific board.
     */
    public function scopeForBoard($query, $boardId)
    {
        return $query->where('board_id', $boardId);
    }

    /**
     * Get the preference for a specific column.
     */
    public function getColumnPreference(string $columnId): array
    {
        return $this->column_preferences[$columnId] ?? [
            'visible' => true,
            'width' => null,
            'position' => null,
        ];
    }

    /**
     * Set the preference for a specific column.
     */
    public function setColumnPreference(string $columnId, array $preference): void
    {
        $preferences = $this->column_preferences ?? [];
        $preferences[$columnId] = array_merge(
            $this->getColumnPreference($columnId),
            $preference
        );
        $this->column_preferences = $preferences;
        $this->save();
    }

    /**
     * Check if a column is visible for the user.
     */
    public function isColumnVisible(string $columnId): bool
    {
        $preference = $this->getColumnPreference($columnId);
        return $preference['visible'] ?? true;
    }

    /**
     * Set column visibility.
     */
    public function setColumnVisibility(string $columnId, bool $visible): void
    {
        $this->setColumnPreference($columnId, ['visible' => $visible]);
    }

    /**
     * Get the width for a specific column.
     */
    public function getColumnWidth(string $columnId): ?float
    {
        $preference = $this->getColumnPreference($columnId);
        return $preference['width'] ?? null;
    }

    /**
     * Set the width for a specific column.
     */
    public function setColumnWidth(string $columnId, ?float $width): void
    {
        $this->setColumnPreference($columnId, ['width' => $width]);
    }

    /**
     * Get the position for a specific column.
     */
    public function getColumnPosition(string $columnId): ?int
    {
        $preference = $this->getColumnPreference($columnId);
        return $preference['position'] ?? null;
    }

    /**
     * Set the position for a specific column.
     */
    public function setColumnPosition(string $columnId, ?int $position): void
    {
        $this->setColumnPreference($columnId, ['position' => $position]);
    }

    /**
     * Get all visible columns.
     */
    public function getVisibleColumns(): array
    {
        $visible = [];
        foreach ($this->column_preferences ?? [] as $columnId => $preference) {
            if ($preference['visible'] ?? true) {
                $visible[] = $columnId;
            }
        }
        return $visible;
    }

    /**
     * Get all hidden columns.
     */
    public function getHiddenColumns(): array
    {
        $hidden = [];
        foreach ($this->column_preferences ?? [] as $columnId => $preference) {
            if (!($preference['visible'] ?? true)) {
                $hidden[] = $columnId;
            }
        }
        return $hidden;
    }

    /**
     * Reset all column preferences to defaults.
     */
    public function resetToDefaults(): void
    {
        $this->column_preferences = [];
        $this->save();
    }

    /**
     * Reset a specific column preference to default.
     */
    public function resetColumnPreference(string $columnId): void
    {
        $preferences = $this->column_preferences ?? [];
        unset($preferences[$columnId]);
        $this->column_preferences = $preferences;
        $this->save();
    }

    /**
     * Get columns sorted by user preference position.
     */
    public function getSortedColumns(array $columnIds): array
    {
        $sorted = [];
        $preferences = $this->column_preferences ?? [];

        // First, add columns with explicit positions
        $withPosition = [];
        $withoutPosition = [];

        foreach ($columnIds as $columnId) {
            $position = $preferences[$columnId]['position'] ?? null;
            if ($position !== null) {
                $withPosition[$position] = $columnId;
            } else {
                $withoutPosition[] = $columnId;
            }
        }

        // Sort by position
        ksort($withPosition);
        $sorted = array_values($withPosition);

        // Add columns without positions at the end
        $sorted = array_merge($sorted, $withoutPosition);

        return $sorted;
    }

    /**
     * Apply preferences to a collection of columns.
     */
    public function applyToColumns($columns)
    {
        return $columns->map(function ($column) {
            $preference = $this->getColumnPreference($column->id);
            
            // Apply width if set
            if (isset($preference['width'])) {
                $column->user_width = $preference['width'];
            }
            
            // Apply visibility
            $column->user_visible = $preference['visible'] ?? true;
            
            return $column;
        })->filter(function ($column) {
            return $column->user_visible ?? true;
        });
    }
}