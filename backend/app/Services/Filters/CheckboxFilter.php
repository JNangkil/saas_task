<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;

class CheckboxFilter extends BaseFilter
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
        ];
    }

    /**
     * Apply the specific filter logic for checkbox columns
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

        // For standard boolean columns, use standard filtering
        return $this->applyStandardFilter($query, $column, $value, $operator);
    }

    /**
     * Validate specific value for checkbox filters
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    protected function validateSpecificValue(mixed $value, string $operator): bool
    {
        // For checkbox operators, value should be a boolean or convertible to boolean
        if (is_bool($value)) {
            return true;
        }

        if (is_string($value)) {
            $lowerValue = strtolower($value);
            return in_array($lowerValue, ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off']);
        }

        if (is_numeric($value)) {
            return in_array($value, [0, 1]);
        }

        return false;
    }

    /**
     * Get specific validation error message for checkbox filters
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    protected function getSpecificValidationError(mixed $value, string $operator): string
    {
        if (!is_bool($value) && !is_string($value) && !is_numeric($value)) {
            return 'Checkbox filter value must be a boolean or convertible to boolean.';
        }

        if (is_string($value)) {
            $lowerValue = strtolower($value);
            if (!in_array($lowerValue, ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'])) {
                return 'String value must be one of: true, false, 1, 0, yes, no, on, off.';
            }
        }

        if (is_numeric($value) && !in_array($value, [0, 1])) {
            return 'Numeric value must be 0 or 1.';
        }

        return 'Invalid checkbox filter value.';
    }

    /**
     * Apply JSON filter specifically for checkbox columns
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
        
        // Convert value to boolean for consistent comparison
        $boolValue = $this->convertToBoolean($value);

        return match ($operator) {
            'equals' => $query->whereJsonPath($column, $jsonPath, '=', $boolValue),
            'not_equals' => $query->whereJsonPath($column, $jsonPath, '!=', $boolValue),
            default => $query,
        };
    }

    /**
     * Convert various value types to boolean
     *
     * @param mixed $value
     * @return bool
     */
    protected function convertToBoolean(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            $lowerValue = strtolower($value);
            return in_array($lowerValue, ['true', '1', 'yes', 'on']);
        }

        if (is_numeric($value)) {
            return (bool) $value;
        }

        return false;
    }

    /**
     * Apply filter for checked checkboxes (true values)
     *
     * @param Builder $query
     * @param string $column
     * @return Builder
     */
    public function applyCheckedFilter(Builder $query, string $column): Builder
    {
        if ($column === 'task_field_values.value') {
            return $query->whereJsonPath($column, '$.value', '=', true);
        } else {
            return $query->where($column, '=', true);
        }
    }

    /**
     * Apply filter for unchecked checkboxes (false values)
     *
     * @param Builder $query
     * @param string $column
     * @return Builder
     */
    public function applyUncheckedFilter(Builder $query, string $column): Builder
    {
        if ($column === 'task_field_values.value') {
            return $query->whereJsonPath($column, '$.value', '=', false);
        } else {
            return $query->where($column, '=', false);
        }
    }

    /**
     * Apply filter for null/undefined checkboxes
     *
     * @param Builder $query
     * @param string $column
     * @return Builder
     */
    public function applyNullFilter(Builder $query, string $column): Builder
    {
        if ($column === 'task_field_values.value') {
            return $query->where(function ($q) use ($column) {
                $q->whereNull($column)
                  ->orWhereJsonPath($column, '$.value', '=', null);
            });
        } else {
            return $query->whereNull($column);
        }
    }

    /**
     * Apply filter for not null checkboxes (either true or false)
     *
     * @param Builder $query
     * @param string $column
     * @return Builder
     */
    public function applyNotNullFilter(Builder $query, string $column): Builder
    {
        if ($column === 'task_field_values.value') {
            return $query->whereNotNull($column)
                        ->whereJsonPath($column, '$.value', '!=', null);
        } else {
            return $query->whereNotNull($column);
        }
    }

    /**
     * Get checkbox options for filtering
     *
     * @return array
     */
    public function getCheckboxOptions(): array
    {
        return [
            ['value' => true, 'label' => 'Checked', 'icon' => 'fas fa-check-square'],
            ['value' => false, 'label' => 'Unchecked', 'icon' => 'fas fa-square'],
        ];
    }

    /**
     * Get the display label for a checkbox value
     *
     * @param mixed $value
     * @return string
     */
    public function getDisplayLabel(mixed $value): string
    {
        $boolValue = $this->convertToBoolean($value);
        return $boolValue ? 'Checked' : 'Unchecked';
    }

    /**
     * Get the icon for a checkbox value
     *
     * @param mixed $value
     * @return string
     */
    public function getIcon(mixed $value): string
    {
        $boolValue = $this->convertToBoolean($value);
        return $boolValue ? 'fas fa-check-square' : 'fas fa-square';
    }

    /**
     * Get the color for a checkbox value
     *
     * @param mixed $value
     * @return string
     */
    public function getColor(mixed $value): string
    {
        $boolValue = $this->convertToBoolean($value);
        return $boolValue ? '#10B981' : '#6B7280'; // Green for checked, gray for unchecked
    }
}