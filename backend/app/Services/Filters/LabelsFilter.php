<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;
use App\Models\Label;

class LabelsFilter extends BaseFilter
{
    /**
     * Get the supported operators for this filter
     *
     * @return array
     */
    public function getSupportedOperators(): array
    {
        return [
            'contains',
            'not_contains',
            'is_empty',
            'is_not_empty',
        ];
    }

    /**
     * Apply the specific filter logic for labels columns
     *
     * @param Builder $query
     * @param string $column
     * @param mixed $value
     * @param string $operator
     * @return Builder
     */
    protected function applyFilter(Builder $query, string $column, mixed $value, string $operator): Builder
    {
        // For dynamic columns (TaskFieldValue), use JSON filtering
        if ($column === 'task_field_values.value') {
            return $this->applyJsonFilter($query, $column, $value, $operator);
        }

        // For standard labels relationships, use relationship filtering
        if ($column === 'labels') {
            return $this->applyRelationshipFilter($query, $value, $operator);
        }

        // For standard labels columns, use standard filtering
        return $this->applyStandardFilter($query, $column, $value, $operator);
    }

    /**
     * Validate specific value for labels filters
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    protected function validateSpecificValue(mixed $value, string $operator): bool
    {
        // For labels operators, validate based on operator type
        if (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            // Value should be an array or single label ID
            if (!is_array($value) && !is_numeric($value) && !is_string($value)) {
                return false;
            }

            // Convert to array for consistent validation
            $labelIds = is_array($value) ? $value : [$value];

            // Check each label ID
            foreach ($labelIds as $labelId) {
                if (!is_numeric($labelId) && !is_string($labelId)) {
                    return false;
                }

                // Check if label exists (for validation purposes)
                if (!$this->labelExists($labelId)) {
                    return false;
                }
            }

            // Limit to reasonable number of labels
            if (count($labelIds) > 20) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get specific validation error message for labels filters
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    protected function getSpecificValidationError(mixed $value, string $operator): string
    {
        if (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_array($value) && !is_numeric($value) && !is_string($value)) {
                return 'Labels filter value must be an array or a single label ID.';
            }

            $labelIds = is_array($value) ? $value : [$value];

            if (count($labelIds) > 20) {
                return 'Labels filter cannot contain more than 20 labels.';
            }

            foreach ($labelIds as $labelId) {
                if (!is_numeric($labelId) && !is_string($labelId)) {
                    return 'All label values must be valid label IDs.';
                }
                if (!$this->labelExists($labelId)) {
                    return "Label with ID {$labelId} does not exist.";
                }
            }
        }

        return 'Invalid labels filter value.';
    }

    /**
     * Check if a label exists
     *
     * @param mixed $labelId
     * @return bool
     */
    protected function labelExists(mixed $labelId): bool
    {
        return Label::where('id', $labelId)->exists();
    }

    /**
     * Apply JSON filter specifically for labels columns
     *
     * @param Builder $query
     * @param string $column
     * @param mixed $value
     * @param string $operator
     * @return Builder
     */
    protected function applyJsonFilter(Builder $query, string $column, mixed $value, string $operator): Builder
    {
        $jsonPath = "$.value"; // JSON path for TaskFieldValue value column

        // Convert single value to array for consistent handling
        $labelIds = is_array($value) ? $value : [$value];

        return match ($operator) {
            'contains' => $query->where(function ($q) use ($column, $jsonPath, $labelIds) {
                foreach ($labelIds as $labelId) {
                    $q->orWhereJsonPath($column, $jsonPath, 'like', "%{$labelId}%");
                }
            }),
            'not_contains' => $query->where(function ($q) use ($column, $jsonPath, $labelIds) {
                foreach ($labelIds as $labelId) {
                    $q->whereJsonPath($column, $jsonPath, 'not like', "%{$labelId}%");
                }
            }),
            'is_empty' => $query->where(function ($q) use ($column, $jsonPath) {
                $q->whereJsonPath($column, $jsonPath, '=', null)
                  ->orWhereJsonPath($column, $jsonPath, '=', '')
                  ->orWhereJsonPath($column, $jsonPath, '=', [])
                  ->orWhereNull($column);
            }),
            'is_not_empty' => $query->where(function ($q) use ($column, $jsonPath) {
                $q->whereJsonPath($column, $jsonPath, '!=', null)
                  ->whereJsonPath($column, $jsonPath, '!=', '')
                  ->whereJsonPath($column, $jsonPath, '!=', [])
                  ->whereNotNull($column);
            }),
            default => $query,
        };
    }

    /**
     * Apply relationship filter for labels (using task_labels relationship)
     *
     * @param Builder $query
     * @param mixed $value
     * @param string $operator
     * @return Builder
     */
    protected function applyRelationshipFilter(Builder $query, mixed $value, string $operator): Builder
    {
        // Convert single value to array for consistent handling
        $labelIds = is_array($value) ? $value : [$value];

        return match ($operator) {
            'contains' => $query->whereHas('labels', function ($q) use ($labelIds) {
                $q->whereIn('labels.id', $labelIds);
            }),
            'not_contains' => $query->whereDoesntHave('labels', function ($q) use ($labelIds) {
                $q->whereIn('labels.id', $labelIds);
            }),
            'is_empty' => $query->whereDoesntHave('labels'),
            'is_not_empty' => $query->whereHas('labels'),
            default => $query,
        };
    }

    /**
     * Apply filter for tasks with all specified labels (AND logic)
     *
     * @param Builder $query
     * @param string $column
     * @param array $labelIds
     * @return Builder
     */
    public function applyAllLabelsFilter(Builder $query, string $column, array $labelIds): Builder
    {
        if ($column === 'labels') {
            // For relationship filtering, use whereHas with count
            return $query->whereHas('labels', function ($q) use ($labelIds) {
                $q->whereIn('labels.id', $labelIds);
            }, '=', count($labelIds));
        }

        // For JSON filtering, check if all labels are present
        return $query->where(function ($q) use ($column, $labelIds) {
            foreach ($labelIds as $labelId) {
                $q->whereJsonPath($column, '$.value', 'like', "%{$labelId}%");
            }
        });
    }

    /**
     * Apply filter for tasks with any of specified labels (OR logic)
     *
     * @param Builder $query
     * @param string $column
     * @param array $labelIds
     * @return Builder
     */
    public function applyAnyLabelsFilter(Builder $query, string $column, array $labelIds): Builder
    {
        if ($column === 'labels') {
            // For relationship filtering, use whereHas withwhereIn
            return $query->whereHas('labels', function ($q) use ($labelIds) {
                $q->whereIn('labels.id', $labelIds);
            });
        }

        // For JSON filtering, check if any label is present
        return $query->where(function ($q) use ($column, $labelIds) {
            foreach ($labelIds as $labelId) {
                $q->orWhereJsonPath($column, '$.value', 'like', "%{$labelId}%");
            }
        });
    }

    /**
     * Get label information for filtering options
     *
     * @param array $labelIds
     * @return array
     */
    public function getLabelOptions(array $labelIds = []): array
    {
        $query = Label::select('id', 'name', 'color');

        if (!empty($labelIds)) {
            $query->whereIn('id', $labelIds);
        }

        return $query->orderBy('name')->get()->map(function ($label) {
            return [
                'id' => $label->id,
                'name' => $label->name,
                'color' => $label->color,
                'display_name' => $label->name,
            ];
        })->toArray();
    }

    /**
     * Apply filter for tasks with a specific number of labels
     *
     * @param Builder $query
     * @param string $column
     * @param string $operator
     * @param int $count
     * @return Builder
     */
    public function applyLabelCountFilter(Builder $query, string $column, string $operator, int $count): Builder
    {
        if ($column === 'labels') {
            // For relationship filtering, use withCount
            $query->withCount('labels');
            
            return match ($operator) {
                'equals' => $query->having('labels_count', '=', $count),
                'greater_than' => $query->having('labels_count', '>', $count),
                'less_than' => $query->having('labels_count', '<', $count),
                'greater_equal' => $query->having('labels_count', '>=', $count),
                'less_equal' => $query->having('labels_count', '<=', $count),
                default => $query,
            };
        }

        // For JSON filtering, we need to use JSON length functions (database specific)
        // This is a simplified approach - in production you'd need database-specific implementations
        return $query->whereRaw("JSON_LENGTH({$column}) {$operator} {$count}");
    }
}