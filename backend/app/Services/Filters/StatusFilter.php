<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;

class StatusFilter extends BaseFilter
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
            'in',
            'not_in',
            'is_empty',
            'is_not_empty',
        ];
    }

    /**
     * Apply the specific filter logic for status columns
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

        // For standard status columns, use standard filtering
        return $this->applyStandardFilter($query, $column, $value, $operator);
    }

    /**
     * Validate specific value for status filters
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    protected function validateSpecificValue(mixed $value, string $operator): bool
    {
        // For status operators, validate based on operator type
        if (in_array($operator, ['in', 'not_in'])) {
            // Value should be an array for in/not_in operators
            if (!is_array($value)) {
                return false;
            }

            // Check each value in the array
            foreach ($value as $status) {
                if (!is_string($status) || !$this->isValidStatus($status)) {
                    return false;
                }
            }

            // Limit the number of statuses in the array
            if (count($value) > 20) {
                return false;
            }
        } elseif (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            // For single value operators, value should be a valid status string
            if (!is_string($value) || !$this->isValidStatus($value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get specific validation error message for status filters
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    protected function getSpecificValidationError(mixed $value, string $operator): string
    {
        if (in_array($operator, ['in', 'not_in'])) {
            if (!is_array($value)) {
                return 'Status filter value must be an array for ' . $operator . ' operator.';
            }

            if (count($value) > 20) {
                return 'Status filter array cannot contain more than 20 values.';
            }

            foreach ($value as $status) {
                if (!is_string($status)) {
                    return 'All status values must be strings.';
                }
                if (!$this->isValidStatus($status)) {
                    return "Invalid status value: {$status}. Valid statuses are: todo, in_progress, review, done.";
                }
            }
        } elseif (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_string($value)) {
                return 'Status filter value must be a string.';
            }
            if (!$this->isValidStatus($value)) {
                return "Invalid status value: {$value}. Valid statuses are: todo, in_progress, review, done.";
            }
        }

        return 'Invalid status filter value.';
    }

    /**
     * Check if a status value is valid
     *
     * @param string $status
     * @return bool
     */
    protected function isValidStatus(string $status): bool
    {
        $validStatuses = ['todo', 'in_progress', 'review', 'done'];
        return in_array($status, $validStatuses);
    }

    /**
     * Apply JSON filter specifically for status columns
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
            'in' => $query->whereJsonPath($column, $jsonPath, 'in', $value),
            'not_in' => $query->whereJsonPath($column, $jsonPath, 'not in', $value),
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
     * Get the default status options for filtering
     *
     * @return array
     */
    public function getStatusOptions(): array
    {
        return [
            ['value' => 'todo', 'label' => 'To Do', 'color' => '#6B7280'],
            ['value' => 'in_progress', 'label' => 'In Progress', 'color' => '#3B82F6'],
            ['value' => 'review', 'label' => 'Review', 'color' => '#F59E0B'],
            ['value' => 'done', 'label' => 'Done', 'color' => '#10B981'],
        ];
    }

    /**
     * Get the status label for a given status value
     *
     * @param string $status
     * @return string
     */
    public function getStatusLabel(string $status): string
    {
        $options = $this->getStatusOptions();
        foreach ($options as $option) {
            if ($option['value'] === $status) {
                return $option['label'];
            }
        }
        return ucfirst($status);
    }

    /**
     * Get the status color for a given status value
     *
     * @param string $status
     * @return string
     */
    public function getStatusColor(string $status): string
    {
        $options = $this->getStatusOptions();
        foreach ($options as $option) {
            if ($option['value'] === $status) {
                return $option['color'];
            }
        }
        return '#6B7280'; // Default gray color
    }
}