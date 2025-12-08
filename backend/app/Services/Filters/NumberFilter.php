<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;

class NumberFilter extends BaseFilter
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
            'greater_than',
            'less_than',
            'greater_equal',
            'less_equal',
            'is_empty',
            'is_not_empty',
        ];
    }

    /**
     * Apply the specific filter logic for numeric columns
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

        // For standard numeric columns, use standard filtering
        return $this->applyStandardFilter($query, $column, $value, $operator);
    }

    /**
     * Validate specific value for numeric filters
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    protected function validateSpecificValue(mixed $value, string $operator): bool
    {
        // For numeric operators, value should be numeric
        if (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_numeric($value)) {
                return false;
            }

            // Check if the number is within reasonable bounds
            $numValue = (float) $value;
            if (abs($numValue) > 999999999.99) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get specific validation error message for numeric filters
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    protected function getSpecificValidationError(mixed $value, string $operator): string
    {
        if (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_numeric($value)) {
                return 'Numeric filter value must be a number.';
            }

            $numValue = (float) $value;
            if (abs($numValue) > 999999999.99) {
                return 'Numeric filter value is too large.';
            }
        }

        return 'Invalid numeric filter value.';
    }

    /**
     * Apply JSON filter specifically for numeric columns
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
            'equals' => $query->whereJsonPath($column, $jsonPath, '=', (float) $value),
            'not_equals' => $query->whereJsonPath($column, $jsonPath, '!=', (float) $value),
            'greater_than' => $query->whereJsonPath($column, $jsonPath, '>', (float) $value),
            'less_than' => $query->whereJsonPath($column, $jsonPath, '<', (float) $value),
            'greater_equal' => $query->whereJsonPath($column, $jsonPath, '>=', (float) $value),
            'less_equal' => $query->whereJsonPath($column, $jsonPath, '<=', (float) $value),
            'is_empty' => $query->where(function ($q) use ($column, $jsonPath) {
                $q->whereJsonPath($column, $jsonPath, '=', null)
                  ->orWhereJsonPath($column, $jsonPath, '=', '')
                  ->orWhereNull($column);
            }),
            'is_not_empty' => $query->where(function ($q) use ($column, $jsonPath) {
                $q->whereJsonPath($column, $jsonPath, '!=', null)
                  ->whereJsonPath($column, $jsonPath, '!=', '')
                  ->whereNotNull($column);
            }),
            default => $query,
        };
    }

    /**
     * Handle range filtering for numeric values
     *
     * @param Builder $query
     * @param string $column
     * @param array $value ['min' => float, 'max' => float]
     * @return Builder
     */
    public function applyRangeFilter(Builder $query, string $column, array $value): Builder
    {
        if (!isset($value['min']) && !isset($value['max'])) {
            return $query;
        }

        if ($column === 'task_field_values.value') {
            $jsonPath = "$.value";
            
            if (isset($value['min']) && isset($value['max'])) {
                return $query->whereJsonPath($column, $jsonPath, '>=', (float) $value['min'])
                             ->whereJsonPath($column, $jsonPath, '<=', (float) $value['max']);
            } elseif (isset($value['min'])) {
                return $query->whereJsonPath($column, $jsonPath, '>=', (float) $value['min']);
            } else {
                return $query->whereJsonPath($column, $jsonPath, '<=', (float) $value['max']);
            }
        } else {
            if (isset($value['min']) && isset($value['max'])) {
                return $query->where($column, '>=', (float) $value['min'])
                             ->where($column, '<=', (float) $value['max']);
            } elseif (isset($value['min'])) {
                return $query->where($column, '>=', (float) $value['min']);
            } else {
                return $query->where($column, '<=', (float) $value['max']);
            }
        }
    }
}