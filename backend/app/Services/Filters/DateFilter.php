<?php

namespace App\Services\Filters;

use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class DateFilter extends BaseFilter
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
     * Apply the specific filter logic for date/datetime columns
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

        // For standard date columns, use standard filtering
        return $this->applyStandardFilter($query, $column, $value, $operator);
    }

    /**
     * Validate specific value for date filters
     *
     * @param mixed $value
     * @param string $operator
     * @return bool
     */
    protected function validateSpecificValue(mixed $value, string $operator): bool
    {
        // For date operators, value should be a valid date
        if (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_string($value) && !is_numeric($value)) {
                return false;
            }

            try {
                // Try to parse the date
                $date = is_numeric($value) ? Carbon::createFromTimestamp($value) : Carbon::parse($value);
                
                // Check if the date is reasonable (not too far in the past or future)
                $minDate = Carbon::create(1900, 1, 1);
                $maxDate = Carbon::create(2100, 12, 31);
                
                if ($date->lt($minDate) || $date->gt($maxDate)) {
                    return false;
                }
                
                return true;
            } catch (\Exception $e) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get specific validation error message for date filters
     *
     * @param mixed $value
     * @param string $operator
     * @return string
     */
    protected function getSpecificValidationError(mixed $value, string $operator): string
    {
        if (!in_array($operator, ['is_empty', 'is_not_empty'])) {
            if (!is_string($value) && !is_numeric($value)) {
                return 'Date filter value must be a string or timestamp.';
            }

            try {
                $date = is_numeric($value) ? Carbon::createFromTimestamp($value) : Carbon::parse($value);
                
                $minDate = Carbon::create(1900, 1, 1);
                $maxDate = Carbon::create(2100, 12, 31);
                
                if ($date->lt($minDate) || $date->gt($maxDate)) {
                    return 'Date must be between 1900-01-01 and 2100-12-31.';
                }
            } catch (\Exception $e) {
                return 'Invalid date format. Please use a valid date format (YYYY-MM-DD, MM/DD/YYYY, etc.).';
            }
        }

        return 'Invalid date filter value.';
    }

    /**
     * Apply JSON filter specifically for date columns
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
        
        // Convert value to standard date format
        $dateValue = $this->formatDateValue($value);

        return match ($operator) {
            'equals' => $query->whereJsonPath($column, $jsonPath, '=', $dateValue),
            'not_equals' => $query->whereJsonPath($column, $jsonPath, '!=', $dateValue),
            'greater_than' => $query->whereJsonPath($column, $jsonPath, '>', $dateValue),
            'less_than' => $query->whereJsonPath($column, $jsonPath, '<', $dateValue),
            'greater_equal' => $query->whereJsonPath($column, $jsonPath, '>=', $dateValue),
            'less_equal' => $query->whereJsonPath($column, $jsonPath, '<=', $dateValue),
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
     * Format date value for database comparison
     *
     * @param mixed $value
     * @return string
     */
    protected function formatDateValue(mixed $value): string
    {
        if (is_numeric($value)) {
            return Carbon::createFromTimestamp($value)->toDateTimeString();
        }
        
        return Carbon::parse($value)->toDateTimeString();
    }

    /**
     * Handle date range filtering
     *
     * @param Builder $query
     * @param string $column
     * @param array $value ['from' => string, 'to' => string]
     * @return Builder
     */
    public function applyDateRangeFilter(Builder $query, string $column, array $value): Builder
    {
        if (!isset($value['from']) && !isset($value['to'])) {
            return $query;
        }

        if ($column === 'task_field_values.value') {
            $jsonPath = "$.value";
            
            if (isset($value['from']) && isset($value['to'])) {
                $fromDate = $this->formatDateValue($value['from']);
                $toDate = $this->formatDateValue($value['to']);
                
                return $query->whereJsonPath($column, $jsonPath, '>=', $fromDate)
                             ->whereJsonPath($column, $jsonPath, '<=', $toDate);
            } elseif (isset($value['from'])) {
                $fromDate = $this->formatDateValue($value['from']);
                return $query->whereJsonPath($column, $jsonPath, '>=', $fromDate);
            } else {
                $toDate = $this->formatDateValue($value['to']);
                return $query->whereJsonPath($column, $jsonPath, '<=', $toDate);
            }
        } else {
            if (isset($value['from']) && isset($value['to'])) {
                return $query->where($column, '>=', $value['from'])
                             ->where($column, '<=', $value['to']);
            } elseif (isset($value['from'])) {
                return $query->where($column, '>=', $value['from']);
            } else {
                return $query->where($column, '<=', $value['to']);
            }
        }
    }

    /**
     * Apply relative date filtering (e.g., "today", "this_week", "this_month")
     *
     * @param Builder $query
     * @param string $column
     * @param string $relativeDate
     * @return Builder
     */
    public function applyRelativeDateFilter(Builder $query, string $column, string $relativeDate): Builder
    {
        $now = Carbon::now();
        $startDate = null;
        $endDate = null;

        return match ($relativeDate) {
            'today' => $this->applyDateRangeFilter($query, $column, [
                'from' => $now->startOfDay()->toDateTimeString(),
                'to' => $now->endOfDay()->toDateTimeString(),
            ]),
            'yesterday' => $this->applyDateRangeFilter($query, $column, [
                'from' => $now->subDay()->startOfDay()->toDateTimeString(),
                'to' => $now->subDay()->endOfDay()->toDateTimeString(),
            ]),
            'this_week' => $this->applyDateRangeFilter($query, $column, [
                'from' => $now->startOfWeek()->toDateTimeString(),
                'to' => $now->endOfWeek()->toDateTimeString(),
            ]),
            'last_week' => $this->applyDateRangeFilter($query, $column, [
                'from' => $now->subWeek()->startOfWeek()->toDateTimeString(),
                'to' => $now->subWeek()->endOfWeek()->toDateTimeString(),
            ]),
            'this_month' => $this->applyDateRangeFilter($query, $column, [
                'from' => $now->startOfMonth()->toDateTimeString(),
                'to' => $now->endOfMonth()->toDateTimeString(),
            ]),
            'last_month' => $this->applyDateRangeFilter($query, $column, [
                'from' => $now->subMonth()->startOfMonth()->toDateTimeString(),
                'to' => $now->subMonth()->endOfMonth()->toDateTimeString(),
            ]),
            'this_year' => $this->applyDateRangeFilter($query, $column, [
                'from' => $now->startOfYear()->toDateTimeString(),
                'to' => $now->endOfYear()->toDateTimeString(),
            ]),
            default => $query,
        };
    }
}