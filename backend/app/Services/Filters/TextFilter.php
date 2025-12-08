<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;

class TextFilter extends BaseFilter
{
    /**
     * Get the supported operators for this filter
     *
     * @return array
     */
    public function getSupportedOperators(): array
    {
        return [
            'equals',
            'not_equals',
            'contains',
            'not_contains',
            'starts_with',
            'ends_with',
            'is_empty',
            'is_not_empty',
        ];
    }

    /**
     * Apply the specific filter logic for text columns
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

        // For standard text columns, use standard filtering
        return $this->applyStandardFilter($query, $column, $value, $operator);
    }

    /**
     * Validate specific value for text filters
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    protected function validateSpecificValue(mixed $value, string $operator): bool
    {
        // For text operators, value should be a string
        if (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_string($value)) {
                return false;
            }

            // Check maximum length
            if (strlen($value) > 255) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get specific validation error message for text filters
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    protected function getSpecificValidationError(mixed $value, string $operator): string
    {
        if (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_string($value)) {
                return 'Text filter value must be a string.';
            }

            if (strlen($value) > 255) {
                return 'Text filter value must not exceed 255 characters.';
            }
        }

        return 'Invalid text filter value.';
    }

    /**
     * Apply JSON filter specifically for text columns
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

        return match ($operator) {
            'equals' => $query->whereJsonPath($column, $jsonPath, '=', $value),
            'not_equals' => $query->whereJsonPath($column, $jsonPath, '!=', $value),
            'contains' => $query->whereJsonPath($column, $jsonPath, 'like', "%{$value}%"),
            'not_contains' => $query->whereJsonPath($column, $jsonPath, 'not like', "%{$value}%"),
            'starts_with' => $query->whereJsonPath($column, $jsonPath, 'like', "{$value}%"),
            'ends_with' => $query->whereJsonPath($column, $jsonPath, 'like', "%{$value}"),
            'is_empty' => $query->where(function ($q) use ($column, $jsonPath) {
                $q->whereJsonPath($column, $jsonPath, '=', '')
                  ->orWhereJsonPath($column, $jsonPath, '=', null)
                  ->orWhereNull($column);
            }),
            'is_not_empty' => $query->where(function ($q) use ($column, $jsonPath) {
                $q->whereJsonPath($column, $jsonPath, '!=', '')
                  ->whereJsonPath($column, $jsonPath, '!=', null)
                  ->whereNotNull($column);
            }),
            default => $query,
        };
    }
}