<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;

class PriorityFilter extends BaseFilter
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
     * Apply the specific filter logic for priority columns
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

        // For standard priority columns, use standard filtering
        return $this->applyStandardFilter($query, $column, $value, $operator);
    }

    /**
     * Validate specific value for priority filters
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    protected function validateSpecificValue(mixed $value, string $operator): bool
    {
        // For priority operators, validate based on operator type
        if (in_array($operator, ['in', 'not_in'])) {
            // Value should be an array for in/not_in operators
            if (!is_array($value)) {
                return false;
            }

            // Check each value in the array
            foreach ($value as $priority) {
                if (!is_string($priority) || !$this->isValidPriority($priority)) {
                    return false;
                }
            }

            // Limit to reasonable number of priorities
            if (count($value) > 10) {
                return false;
            }
        } elseif (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            // For single value operators, value should be a valid priority string
            if (!is_string($value) || !$this->isValidPriority($value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get specific validation error message for priority filters
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    protected function getSpecificValidationError(mixed $value, string $operator): string
    {
        if (in_array($operator, ['in', 'not_in'])) {
            if (!is_array($value)) {
                return 'Priority filter value must be an array for ' . $operator . ' operator.';
            }

            if (count($value) > 10) {
                return 'Priority filter array cannot contain more than 10 values.';
            }

            foreach ($value as $priority) {
                if (!is_string($priority)) {
                    return 'All priority values must be strings.';
                }
                if (!$this->isValidPriority($priority)) {
                    return "Invalid priority value: {$priority}. Valid priorities are: low, medium, high, urgent.";
                }
            }
        } elseif (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_string($value)) {
                return 'Priority filter value must be a string.';
            }
            if (!$this->isValidPriority($value)) {
                return "Invalid priority value: {$value}. Valid priorities are: low, medium, high, urgent.";
            }
        }

        return 'Invalid priority filter value.';
    }

    /**
     * Check if a priority value is valid
     *
     * @param string $priority
     * @return bool
     */
    protected function isValidPriority(string $priority): bool
    {
        $validPriorities = ['low', 'medium', 'high', 'urgent'];
        return in_array($priority, $validPriorities);
    }

    /**
     * Apply JSON filter specifically for priority columns
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
     * Get the default priority options for filtering
     *
     * @return array
     */
    public function getPriorityOptions(): array
    {
        return [
            ['value' => 'low', 'label' => 'Low', 'color' => '#6B7280', 'level' => 1],
            ['value' => 'medium', 'label' => 'Medium', 'color' => '#F59E0B', 'level' => 2],
            ['value' => 'high', 'label' => 'High', 'color' => '#EF4444', 'level' => 3],
            ['value' => 'urgent', 'label' => 'Urgent', 'color' => '#DC2626', 'level' => 4],
        ];
    }

    /**
     * Get the priority label for a given priority value
     *
     * @param string $priority
     * @return string
     */
    public function getPriorityLabel(string $priority): string
    {
        $options = $this->getPriorityOptions();
        foreach ($options as $option) {
            if ($option['value'] === $priority) {
                return $option['label'];
            }
        }
        return ucfirst($priority);
    }

    /**
     * Get the priority color for a given priority value
     *
     * @param string $priority
     * @return string
     */
    public function getPriorityColor(string $priority): string
    {
        $options = $this->getPriorityOptions();
        foreach ($options as $option) {
            if ($option['value'] === $priority) {
                return $option['color'];
            }
        }
        return '#6B7280'; // Default gray color
    }

    /**
     * Get the priority level for a given priority value
     *
     * @param string $priority
     * @return int
     */
    public function getPriorityLevel(string $priority): int
    {
        $options = $this->getPriorityOptions();
        foreach ($options as $option) {
            if ($option['value'] === $priority) {
                return $option['level'];
            }
        }
        return 1; // Default to lowest level
    }

    /**
     * Apply priority level filtering (e.g., "high_or_above", "medium_or_below")
     *
     * @param Builder $query
     * @param string $column
     * @param string $levelFilter
     * @return Builder
     */
    public function applyPriorityLevelFilter(Builder $query, string $column, string $levelFilter): Builder
    {
        $priorities = match ($levelFilter) {
            'low_or_above' => ['low', 'medium', 'high', 'urgent'],
            'medium_or_above' => ['medium', 'high', 'urgent'],
            'high_or_above' => ['high', 'urgent'],
            'urgent_only' => ['urgent'],
            'medium_or_below' => ['low', 'medium'],
            'high_or_below' => ['low', 'medium', 'high'],
            default => [],
        };

        if (empty($priorities)) {
            return $query;
        }

        if ($column === 'task_field_values.value') {
            return $query->whereJsonPath($column, '$.value', 'in', $priorities);
        } else {
            return $query->whereIn($column, $priorities);
        }
    }
}