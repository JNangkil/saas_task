<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;

interface FilterInterface
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
    public function apply(Builder $query, string $column, mixed $value, string $operator): Builder;

    /**
     * Get the supported operators for this filter
     *
     * @return array
     */
    public function getSupportedOperators(): array;

    /**
     * Validate the filter value
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    public function validateValue(mixed $value, string $operator): bool;

    /**
     * Get the validation error message
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    public function getValidationError(mixed $value, string $operator): string;
}