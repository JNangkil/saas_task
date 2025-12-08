<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;

class SelectFilter extends BaseFilter
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
     * Apply the specific filter logic for select columns
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

        // For standard select columns, use standard filtering
        return $this->applyStandardFilter($query, $column, $value, $operator);
    }

    /**
     * Validate specific value for select filters
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    protected function validateSpecificValue(mixed $value, string $operator): bool
    {
        // For select operators, validate based on operator type
        if (in_array($operator, ['in', 'not_in'])) {
            // Value should be an array for in/not_in operators
            if (!is_array($value)) {
                return false;
            }

            // Check each value in the array
            foreach ($value as $option) {
                if (!is_string($option) && !is_numeric($option)) {
                    return false;
                }
            }

            // Limit to reasonable number of options
            if (count($value) > 50) {
                return false;
            }
        } elseif (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            // For single value operators, value should be a string or number
            if (!is_string($value) && !is_numeric($value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get specific validation error message for select filters
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    protected function getSpecificValidationError(mixed $value, string $operator): string
    {
        if (in_array($operator, ['in', 'not_in'])) {
            if (!is_array($value)) {
                return 'Select filter value must be an array for ' . $operator . ' operator.';
            }

            if (count($value) > 50) {
                return 'Select filter array cannot contain more than 50 values.';
            }

            foreach ($value as $option) {
                if (!is_string($option) && !is_numeric($option)) {
                    return 'All select filter values must be strings or numbers.';
                }
            }
        } elseif (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_string($value) && !is_numeric($value)) {
                return 'Select filter value must be a string or number.';
            }
        }

        return 'Invalid select filter value.';
    }

    /**
     * Apply JSON filter specifically for select columns
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
     * Validate select options against allowed options
     *
     * @param mixed $value
     * @param array $allowedOptions
     * @param string $operator
     * @return bool
     */
    public function validateAgainstOptions(mixed $value, array $allowedOptions, string $operator): bool
    {
        // Extract option values from the options array
        $optionValues = array_column($allowedOptions, 'value');

        if (in_array($operator, ['in', 'not_in'])) {
            if (!is_array($value)) {
                return false;
            }

            foreach ($value as $option) {
                if (!in_array($option, $optionValues)) {
                    return false;
                }
            }
        } elseif (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!in_array($value, $optionValues)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get validation error for options mismatch
     *
     * @param mixed $value
     * @param array $allowedOptions
     * @param string $operator
     * @return string
     */
    public function getOptionsValidationError(mixed $value, array $allowedOptions, string $operator): string
    {
        $optionValues = array_column($allowedOptions, 'value');
        $optionLabels = array_column($allowedOptions, 'label');

        if (in_array($operator, ['in', 'not_in'])) {
            if (!is_array($value)) {
                return 'Select filter value must be an array for ' . $operator . ' operator.';
            }

            $invalidOptions = [];
            foreach ($value as $option) {
                if (!in_array($option, $optionValues)) {
                    $invalidOptions[] = $option;
                }
            }

            if (!empty($invalidOptions)) {
                return 'Invalid select options: ' . implode(', ', $invalidOptions) . 
                       '. Valid options are: ' . implode(', ', $optionLabels);
            }
        } elseif (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!in_array($value, $optionValues)) {
                return 'Invalid select option: ' . $value . 
                       '. Valid options are: ' . implode(', ', $optionLabels);
            }
        }

        return 'Invalid select filter value.';
    }

    /**
     * Get select options for filtering
     *
     * @param array $options
     * @return array
     */
    public function getSelectOptions(array $options = []): array
    {
        if (empty($options)) {
            return [];
        }

        return array_map(function ($option) {
            return [
                'value' => $option['value'] ?? $option,
                'label' => $option['label'] ?? $option,
                'color' => $option['color'] ?? null,
                'icon' => $option['icon'] ?? null,
            ];
        }, $options);
    }

    /**
     * Get display label for a select option value
     *
     * @param mixed $value
     * @param array $options
     * @return string
     */
    public function getOptionLabel(mixed $value, array $options): string
    {
        foreach ($options as $option) {
            $optionValue = $option['value'] ?? $option;
            if ($optionValue == $value) {
                return $option['label'] ?? $optionValue;
            }
        }

        return (string) $value;
    }

    /**
     * Get color for a select option value
     *
     * @param mixed $value
     * @param array $options
     * @return string|null
     */
    public function getOptionColor(mixed $value, array $options): ?string
    {
        foreach ($options as $option) {
            $optionValue = $option['value'] ?? $option;
            if ($optionValue == $value) {
                return $option['color'] ?? null;
            }
        }

        return null;
    }

    /**
     * Get icon for a select option value
     *
     * @param mixed $value
     * @param array $options
     * @return string|null
     */
    public function getOptionIcon(mixed $value, array $options): ?string
    {
        foreach ($options as $option) {
            $optionValue = $option['value'] ?? $option;
            if ($optionValue == $value) {
                return $option['icon'] ?? null;
            }
        }

        return null;
    }

    /**
     * Apply filter for multi-select columns (where values are stored as arrays)
     *
     * @param Builder $query
     * @param string $column
     * @param mixed $value
     * @param string $operator
     * @return Builder
     */
    public function applyMultiSelectFilter(Builder $query, string $column, mixed $value, string $operator): Builder
    {
        if ($column === 'task_field_values.value') {
            $jsonPath = "$.value"; // JSON path for TaskFieldValue value column

            return match ($operator) {
                'contains' => $query->whereJsonPath($column, $jsonPath, 'like', "%{$value}%"),
                'not_contains' => $query->whereJsonPath($column, $jsonPath, 'not like', "%{$value}%"),
                'contains_all' => $this->applyContainsAllFilter($query, $column, is_array($value) ? $value : [$value]),
                'contains_any' => $this->applyContainsAnyFilter($query, $column, is_array($value) ? $value : [$value]),
                'is_empty' => $query->where(function ($q) use ($column, $jsonPath) {
                    $q->whereJsonPath($column, $jsonPath, '=', null)
                      ->orWhereJsonPath($column, $jsonPath, '=', [])
                      ->orWhereNull($column);
                }),
                'is_not_empty' => $query->where(function ($q) use ($column, $jsonPath) {
                    $q->whereJsonPath($column, $jsonPath, '!=', null)
                      ->whereJsonPath($column, $jsonPath, '!=', [])
                      ->whereNotNull($column);
                }),
                default => $query,
            };
        }

        // For standard array columns, use different approach
        return match ($operator) {
            'contains' => $query->where($column, 'like', "%{$value}%"),
            'not_contains' => $query->where($column, 'not like', "%{$value}%"),
            'contains_all' => $this->applyContainsAllFilter($query, $column, is_array($value) ? $value : [$value]),
            'contains_any' => $this->applyContainsAnyFilter($query, $column, is_array($value) ? $value : [$value]),
            'is_empty' => $query->where(function ($q) use ($column) {
                $q->whereNull($column)
                  ->orWhere($column, '=', '')
                  ->orWhere($column, '=', []);
            }),
            'is_not_empty' => $query->where(function ($q) use ($column) {
                $q->whereNotNull($column)
                  ->where($column, '!=', '')
                  ->where($column, '!=', []);
            }),
            default => $query,
        };
    }

    /**
     * Apply filter for arrays containing all specified values
     *
     * @param Builder $query
     * @param string $column
     * @param array $values
     * @return Builder
     */
    protected function applyContainsAllFilter(Builder $query, string $column, array $values): Builder
    {
        foreach ($values as $value) {
            $query->whereJsonPath($column, '$.value', 'like', "%{$value}%");
        }
        return $query;
    }

    /**
     * Apply filter for arrays containing any of the specified values
     *
     * @param Builder $query
     * @param string $column
     * @param array $values
     * @return Builder
     */
    protected function applyContainsAnyFilter(Builder $query, string $column, array $values): Builder
    {
        return $query->where(function ($q) use ($column, $values) {
            foreach ($values as $value) {
                $q->orWhereJsonPath($column, '$.value', 'like', "%{$value}%");
            }
        });
    }
}