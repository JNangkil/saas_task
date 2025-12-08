<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;

abstract class BaseFilter implements FilterInterface
{
    /**
     * Apply the filter to a query builder
     *
     * @param Builder $query
     * @param string $column
     * @param mixed $value
     * @param string $operator
     * @return Builder
     */
    public function apply(Builder $query, string $column, mixed $value, string $operator): Builder
    {
        // Log the filter application for debugging
        Log::debug('Applying filter', [
            'column' => $column,
            'operator' => $operator,
            'value' => $value,
            'filter_class' => static::class,
        ]);

        // Validate the value before applying
        if (!$this->validateValue($value, $operator)) {
            Log::warning('Invalid filter value', [
                'column' => $column,
                'operator' => $operator,
                'value' => $value,
                'error' => $this->getValidationError($value, $operator),
            ]);
            return $query;
        }

        // Apply the specific filter logic
        return $this->applyFilter($query, $column, $value, $operator);
    }

    /**
     * Apply the specific filter logic - to be implemented by child classes
     *
     * @param Builder $query
     * @param string $column
     * @param mixed $value
     * @param string $operator
     * @return Builder
     */
    abstract protected function applyFilter(Builder $query, string $column, mixed $value, string $operator): Builder;

    /**
     * Validate the filter value
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    public function validateValue(mixed $value, string $operator): bool
    {
        // Check if operator is supported
        if (!in_array($operator, $this->getSupportedOperators())) {
            return false;
        }

        // Basic validation for null/empty values
        if (in_array($operator, ['is_null', 'is_not_null'])) {
            return true;
        }

        // For other operators, value should not be null
        if ($value === null) {
            return false;
        }

        // Perform specific validation based on operator
        return $this->validateSpecificValue($value, $operator);
    }

    /**
     * Validate specific value for the filter type - to be implemented by child classes
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    abstract protected function validateSpecificValue(mixed $value, string $operator): bool;

    /**
     * Get the validation error message
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    public function getValidationError(mixed $value, string $operator): string
    {
        if (!in_array($operator, $this->getSupportedOperators())) {
            return "Operator '{$operator}' is not supported for this filter type.";
        }

        if ($value === null && !in_array($operator, ['is_null', 'is_not_null'])) {
            return 'Value cannot be null for this operator.';
        }

        return $this->getSpecificValidationError($value, $operator);
    }

    /**
     * Get specific validation error message - to be implemented by child classes
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    abstract protected function getSpecificValidationError(mixed $value, string $operator): string;

    /**
     * Apply JSON column filter for dynamic columns
     *
     * @param Builder $query
     * @param string $column
     * @param mixed $value
     * @param string $operator
     * @return Builder
     */
    protected function applyJsonFilter(Builder $query, string $column, mixed $value, string $operator): Builder
    {
        $jsonPath = "$.value"; // Default JSON path for TaskFieldValue value column

        return match ($operator) {
            'equals' => $query->whereJsonPath($column, $jsonPath, '=', $value),
            'not_equals' => $query->whereJsonPath($column, $jsonPath, '!=', $value),
            'contains' => $query->whereJsonPath($column, $jsonPath, 'like', "%{$value}%"),
            'not_contains' => $query->whereJsonPath($column, $jsonPath, 'not like', "%{$value}%"),
            'starts_with' => $query->whereJsonPath($column, $jsonPath, 'like', "{$value}%"),
            'ends_with' => $query->whereJsonPath($column, $jsonPath, 'like', "%{$value}"),
            'greater_than' => $query->whereJsonPath($column, $jsonPath, '>', $value),
            'less_than' => $query->whereJsonPath($column, $jsonPath, '<', $value),
            'greater_equal' => $query->whereJsonPath($column, $jsonPath, '>=', $value),
            'less_equal' => $query->whereJsonPath($column, $jsonPath, '<=', $value),
            'in' => $query->whereJsonPath($column, $jsonPath, 'in', is_array($value) ? $value : [$value]),
            'not_in' => $query->whereJsonPath($column, $jsonPath, 'not in', is_array($value) ? $value : [$value]),
            'is_null' => $query->whereNull($column)->orWhereJsonPath($column, $jsonPath, '=', null),
            'is_not_null' => $query->whereNotNull($column)->whereJsonPath($column, $jsonPath, '!=', null),
            'is_empty' => $query->whereJsonPath($column, $jsonPath, '=', '')
                ->orWhereJsonPath($column, $jsonPath, '=', [])
                ->orWhereNull($column),
            'is_not_empty' => $query->whereJsonPath($column, $jsonPath, '!=', '')
                ->whereJsonPath($column, $jsonPath, '!=', [])
                ->whereNotNull($column),
            default => $query,
        };
    }

    /**
     * Apply standard column filter for regular database columns
     *
     * @param Builder $query
     * @param string $column
     * @param mixed $value
     * @param string $operator
     * @return Builder
     */
    protected function applyStandardFilter(Builder $query, string $column, mixed $value, string $operator): Builder
    {
        return match ($operator) {
            'equals' => $query->where($column, '=', $value),
            'not_equals' => $query->where($column, '!=', $value),
            'contains' => $query->where($column, 'like', "%{$value}%"),
            'not_contains' => $query->where($column, 'not like', "%{$value}%"),
            'starts_with' => $query->where($column, 'like', "{$value}%"),
            'ends_with' => $query->where($column, 'like', "%{$value}"),
            'greater_than' => $query->where($column, '>', $value),
            'less_than' => $query->where($column, '<', $value),
            'greater_equal' => $query->where($column, '>=', $value),
            'less_equal' => $query->where($column, '<=', $value),
            'in' => $query->whereIn($column, is_array($value) ? $value : [$value]),
            'not_in' => $query->whereNotIn($column, is_array($value) ? $value : [$value]),
            'is_null' => $query->whereNull($column),
            'is_not_null' => $query->whereNotNull($column),
            'is_empty' => $query->where($column, '=', '')
                ->orWhere($column, '=', [])
                ->orWhereNull($column),
            'is_not_empty' => $query->where($column, '!=', '')
                ->where($column, '!=', [])
                ->whereNotNull($column),
            default => $query,
        };
    }
}