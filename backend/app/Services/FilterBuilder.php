<?php

namespace App\Services;

use App\Services\Filters\FilterInterface;
use App\Services\Filters\TextFilter;
use App\Services\Filters\NumberFilter;
use App\Services\Filters\DateFilter;
use App\Services\Filters\StatusFilter;
use App\Services\Filters\PriorityFilter;
use App\Services\Filters\AssigneeFilter;
use App\Services\Filters\LabelsFilter;
use App\Services\Filters\CheckboxFilter;
use App\Services\Filters\SelectFilter;
use App\Enums\ColumnType;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class FilterBuilder
{
    /**
     * Filter instances cache
     *
     * @var array
     */
    protected array $filters = [];

    /**
     * Constructor - Initialize all filter instances
     */
    public function __construct()
    {
        $this->initializeFilters();
    }

    /**
     * Initialize all filter instances
     */
    protected function initializeFilters(): void
    {
        $this->filters = [
            ColumnType::TEXT->value => new TextFilter(),
            ColumnType::LONG_TEXT->value => new TextFilter(),
            ColumnType::NUMBER->value => new NumberFilter(),
            ColumnType::CURRENCY->value => new NumberFilter(),
            ColumnType::PERCENTAGE->value => new NumberFilter(),
            ColumnType::DATE->value => new DateFilter(),
            ColumnType::DATETIME->value => new DateFilter(),
            ColumnType::STATUS->value => new StatusFilter(),
            ColumnType::PRIORITY->value => new PriorityFilter(),
            ColumnType::ASSIGNEE->value => new AssigneeFilter(),
            ColumnType::LABELS->value => new LabelsFilter(),
            ColumnType::CHECKBOX->value => new CheckboxFilter(),
            ColumnType::URL->value => new TextFilter(),
            ColumnType::EMAIL->value => new TextFilter(),
            ColumnType::PHONE->value => new TextFilter(),
        ];
    }

    /**
     * Get filter instance for a column type
     *
     * @param string $columnType
     * @return FilterInterface|null
     */
    public function getFilter(string $columnType): ?FilterInterface
    {
        return $this->filters[$columnType] ?? null;
    }

    /**
     * Build filter from API request data
     *
     * @param array $filterData
     * @return array
     * @throws ValidationException
     */
    public function buildFilter(array $filterData): array
    {
        $this->validateFilterStructure($filterData);

        $filter = [
            'column' => $filterData['column'],
            'column_type' => $filterData['column_type'],
            'operator' => $filterData['operator'],
            'value' => $filterData['value'] ?? null,
            'logic' => $filterData['logic'] ?? 'AND',
        ];

        // Get the appropriate filter for this column type
        $filterInstance = $this->getFilter($filter['column_type']);
        if (!$filterInstance) {
            throw ValidationException::withMessages([
                'column_type' => "Unsupported column type: {$filter['column_type']}"
            ]);
        }

        // Validate the filter value
        if (!$filterInstance->validateValue($filter['value'], $filter['operator'])) {
            throw ValidationException::withMessages([
                'value' => $filterInstance->getValidationError($filter['value'], $filter['operator'])
            ]);
        }

        return $filter;
    }

    /**
     * Build multiple filters from API request data
     *
     * @param array $filtersData
     * @return array
     * @throws ValidationException
     */
    public function buildFilters(array $filtersData): array
    {
        $filters = [];
        $groupIndex = 0;

        foreach ($filtersData as $filterGroup) {
            // Handle nested filter groups
            if (isset($filterGroup['filters']) && is_array($filterGroup['filters'])) {
                $groupFilters = [];
                foreach ($filterGroup['filters'] as $filterData) {
                    $groupFilters[] = $this->buildFilter($filterData);
                }

                $filters[] = [
                    'type' => 'group',
                    'logic' => $filterGroup['logic'] ?? 'AND',
                    'filters' => $groupFilters,
                    'group_index' => $groupIndex++,
                ];
            } else {
                // Handle individual filter
                $filters[] = array_merge(
                    $this->buildFilter($filterGroup),
                    ['type' => 'filter', 'group_index' => $groupIndex++]
                );
            }
        }

        return $filters;
    }

    /**
     * Validate filter structure
     *
     * @param array $filterData
     * @throws ValidationException
     */
    protected function validateFilterStructure(array $filterData): void
    {
        $requiredFields = ['column', 'column_type', 'operator'];
        
        foreach ($requiredFields as $field) {
            if (!isset($filterData[$field])) {
                throw ValidationException::withMessages([
                    $field => "Field '{$field}' is required"
                ]);
            }
        }

        // Validate column type
        if (!ColumnType::tryFrom($filterData['column_type'])) {
            throw ValidationException::withMessages([
                'column_type' => "Invalid column type: {$filterData['column_type']}"
            ]);
        }

        // Validate logic operator
        if (isset($filterData['logic']) && !in_array(strtoupper($filterData['logic']), ['AND', 'OR'])) {
            throw ValidationException::withMessages([
                'logic' => "Logic operator must be 'AND' or 'OR'"
            ]);
        }
    }

    /**
     * Parse filter definition from JSON string
     *
     * @param string $jsonFilter
     * @return array
     * @throws ValidationException
     */
    public function parseFromJson(string $jsonFilter): array
    {
        try {
            $filterData = json_decode($jsonFilter, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \InvalidArgumentException('Invalid JSON: ' . json_last_error_msg());
            }

            if (!is_array($filterData)) {
                throw new \InvalidArgumentException('Filter data must be an array');
            }

            return $this->buildFilters($filterData);
        } catch (\Exception $e) {
            Log::error('Failed to parse filter JSON', [
                'json' => $jsonFilter,
                'error' => $e->getMessage(),
            ]);

            throw ValidationException::withMessages([
                'filter' => 'Invalid filter definition: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Convert filters to JSON string for storage
     *
     * @param array $filters
     * @return string
     */
    public function toJson(array $filters): string
    {
        return json_encode($filters, JSON_PRETTY_PRINT);
    }

    /**
     * Get available operators for a column type
     *
     * @param string $columnType
     * @return array
     */
    public function getAvailableOperators(string $columnType): array
    {
        $filter = $this->getFilter($columnType);
        return $filter ? $filter->getSupportedOperators() : [];
    }

    /**
     * Validate filter group structure
     *
     * @param array $filterGroup
     * @throws ValidationException
     */
    public function validateFilterGroup(array $filterGroup): void
    {
        if (!isset($filterGroup['filters']) || !is_array($filterGroup['filters'])) {
            throw ValidationException::withMessages([
                'filters' => 'Filter group must contain a "filters" array'
            ]);
        }

        if (empty($filterGroup['filters'])) {
            throw ValidationException::withMessages([
                'filters' => 'Filter group cannot be empty'
            ]);
        }

        if (isset($filterGroup['logic']) && !in_array(strtoupper($filterGroup['logic']), ['AND', 'OR'])) {
            throw ValidationException::withMessages([
                'logic' => "Logic operator must be 'AND' or 'OR'"
            ]);
        }
    }

    /**
     * Build filter from saved filter data
     *
     * @param array $savedFilterData
     * @return array
     */
    public function buildFromSavedFilter(array $savedFilterData): array
    {
        if (isset($savedFilterData['filter_definition'])) {
            return $this->parseFromJson($savedFilterData['filter_definition']);
        }

        return [];
    }

    /**
     * Get filter summary for display
     *
     * @param array $filter
     * @return string
     */
    public function getFilterSummary(array $filter): string
    {
        $column = $filter['column'] ?? 'Unknown';
        $operator = $filter['operator'] ?? 'Unknown';
        $value = $filter['value'] ?? '';
        
        // Format value for display
        if (is_array($value)) {
            $value = '[' . implode(', ', $value) . ']';
        } elseif (is_bool($value)) {
            $value = $value ? 'true' : 'false';
        }

        return "{$column} {$operator} {$value}";
    }

    /**
     * Get filter group summary for display
     *
     * @param array $filterGroup
     * @return string
     */
    public function getFilterGroupSummary(array $filterGroup): string
    {
        $logic = strtoupper($filterGroup['logic'] ?? 'AND');
        $summaries = [];

        foreach ($filterGroup['filters'] as $filter) {
            $summaries[] = $this->getFilterSummary($filter);
        }

        return '(' . implode(" {$logic} ", $summaries) . ')';
    }

    /**
     * Check if a filter is valid for a column type
     *
     * @param string $columnType
     * @param string $operator
     * @return bool
     */
    public function isOperatorValid(string $columnType, string $operator): bool
    {
        $availableOperators = $this->getAvailableOperators($columnType);
        return in_array($operator, $availableOperators);
    }

    /**
     * Get all available column types for filtering
     *
     * @return array
     */
    public function getAvailableColumnTypes(): array
    {
        return array_keys($this->filters);
    }
}