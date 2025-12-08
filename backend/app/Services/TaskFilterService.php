<?php

namespace App\Services;

use App\Services\Filters\FilterInterface;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Task;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TaskFilterService
{
    /**
     * Filter builder instance
     *
     * @var FilterBuilder
     */
    protected FilterBuilder $filterBuilder;

    /**
     * Constructor
     *
     * @param FilterBuilder $filterBuilder
     */
    public function __construct(FilterBuilder $filterBuilder)
    {
        $this->filterBuilder = $filterBuilder;
    }

    /**
     * Apply filters to a task query
     *
     * @param Builder $query
     * @param Board $board
     * @param array $filters
     * @return Builder
     */
    public function applyFilters(Builder $query, Board $board, array $filters): Builder
    {
        if (empty($filters)) {
            return $query;
        }

        Log::info('Applying task filters', [
            'board_id' => $board->id,
            'filter_count' => count($filters),
        ]);

        // Apply filters with proper grouping and logic
        return $query->where(function ($subQuery) use ($board, $filters) {
            $this->applyFilterGroup($subQuery, $board, $filters, 'AND');
        });
    }

    /**
     * Apply a group of filters with specified logic
     *
     * @param Builder $query
     * @param Board $board
     * @param array $filters
     * @param string $logic
     * @return Builder
     */
    protected function applyFilterGroup(Builder $query, Board $board, array $filters, string $logic): Builder
    {
        foreach ($filters as $filter) {
            if ($filter['type'] === 'group') {
                // Apply nested filter group
                $query->where(function ($subQuery) use ($board, $filter) {
                    $this->applyFilterGroup($subQuery, $board, $filter['filters'], $filter['logic']);
                }, null, null, $logic);
            } else {
                // Apply individual filter
                $this->applyIndividualFilter($query, $board, $filter, $logic);
            }
        }

        return $query;
    }

    /**
     * Apply an individual filter
     *
     * @param Builder $query
     * @param Board $board
     * @param array $filter
     * @param string $logic
     * @return Builder
     */
    protected function applyIndividualFilter(Builder $query, Board $board, array $filter, string $logic): Builder
    {
        $column = $filter['column'];
        $columnType = $filter['column_type'];
        $operator = $filter['operator'];
        $value = $filter['value'];

        // Get the appropriate filter for this column type
        $filterInstance = $this->filterBuilder->getFilter($columnType);
        if (!$filterInstance) {
            Log::warning('Unsupported column type for filtering', [
                'column_type' => $columnType,
                'column' => $column,
            ]);
            return $query;
        }

        // Determine if this is a standard task column or a dynamic column
        if ($this->isStandardTaskColumn($column)) {
            // Apply filter to standard task column
            return $query->where(function ($subQuery) use ($filterInstance, $column, $value, $operator) {
                $filterInstance->apply($subQuery, $column, $value, $operator);
            }, null, null, $logic);
        } else {
            // Apply filter to dynamic column
            return $this->applyDynamicColumnFilter($query, $board, $filter, $logic);
        }
    }

    /**
     * Apply filter to dynamic column
     *
     * @param Builder $query
     * @param Board $board
     * @param array $filter
     * @param string $logic
     * @return Builder
     */
    protected function applyDynamicColumnFilter(Builder $query, Board $board, array $filter, string $logic): Builder
    {
        $column = $filter['column'];
        $columnType = $filter['column_type'];
        $operator = $filter['operator'];
        $value = $filter['value'];

        // Find the board column
        $boardColumn = $board->columns()->where('name', $column)->first();
        if (!$boardColumn) {
            Log::warning('Dynamic column not found for filtering', [
                'column' => $column,
                'board_id' => $board->id,
            ]);
            return $query;
        }

        // Get the appropriate filter
        $filterInstance = $this->filterBuilder->getFilter($columnType);
        if (!$filterInstance) {
            return $query;
        }

        // Apply filter using a subquery for task field values
        return $query->where(function ($subQuery) use ($boardColumn, $filterInstance, $operator, $value) {
            $subQuery->whereExists(function ($existsQuery) use ($boardColumn, $filterInstance, $operator, $value) {
                $existsQuery->select(DB::raw(1))
                    ->from('task_field_values')
                    ->whereColumn('task_field_values.task_id', 'tasks.id')
                    ->where('task_field_values.board_column_id', $boardColumn->id);

                // Apply the filter to the task_field_values.value column
                $filterInstance->apply($existsQuery, 'task_field_values.value', $value, $operator);
            });
        }, null, null, $logic);
    }

    /**
     * Check if a column is a standard task column
     *
     * @param string $column
     * @return bool
     */
    protected function isStandardTaskColumn(string $column): bool
    {
        $standardColumns = [
            'id', 'title', 'description', 'status', 'priority', 'assignee_id',
            'creator_id', 'board_id', 'workspace_id', 'tenant_id', 'position',
            'due_date', 'start_date', 'completed_at', 'archived_at',
            'created_at', 'updated_at',
        ];

        return in_array($column, $standardColumns);
    }

    /**
     * Apply sorting to the query
     *
     * @param Builder $query
     * @param Board $board
     * @param string $sortBy
     * @param string $sortOrder
     * @return Builder
     */
    public function applySorting(Builder $query, Board $board, string $sortBy, string $sortOrder = 'asc'): Builder
    {
        $sortOrder = strtolower($sortOrder);
        if (!in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'asc';
        }

        // Check if this is a standard task column
        if ($this->isStandardTaskColumn($sortBy)) {
            return $query->orderBy($sortBy, $sortOrder);
        }

        // Apply sorting for dynamic columns
        return $this->applyDynamicColumnSorting($query, $board, $sortBy, $sortOrder);
    }

    /**
     * Apply sorting for dynamic columns
     *
     * @param Builder $query
     * @param Board $board
     * @param string $sortBy
     * @param string $sortOrder
     * @return Builder
     */
    protected function applyDynamicColumnSorting(Builder $query, Board $board, string $sortBy, string $sortOrder): Builder
    {
        // Find the board column
        $boardColumn = $board->columns()->where('name', $sortBy)->first();
        if (!$boardColumn) {
            Log::warning('Dynamic column not found for sorting', [
                'column' => $sortBy,
                'board_id' => $board->id,
            ]);
            return $query;
        }

        // Apply sorting using a subquery for task field values
        $sortColumn = "sort_{$boardColumn->id}";
        
        return $query->leftJoin("task_field_values as {$sortColumn}", function ($join) use ($boardColumn, $sortColumn) {
            $join->on("{$sortColumn}.task_id", '=', 'tasks.id')
                 ->where("{$sortColumn}.board_column_id", '=', $boardColumn->id);
        })
        ->orderByRaw("COALESCE({$sortColumn}.value->>'$.value', '') {$sortOrder}")
        ->select('tasks.*'); // Ensure we only select task columns to avoid conflicts
    }

    /**
     * Apply pagination to the query
     *
     * @param Builder $query
     * @param int $perPage
     * @param int|null $page
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function applyPagination(Builder $query, int $perPage = 15, ?int $page = null)
    {
        $perPage = max(1, min(100, $perPage)); // Limit between 1 and 100
        
        return $query->paginate($perPage, ['*'], 'page', $page);
    }

    /**
     * Apply cursor-based pagination to the query
     *
     * @param Builder $query
     * @param int $perPage
     * @param string|null $cursor
     * @return \Illuminate\Contracts\Pagination\CursorPaginator
     */
    public function applyCursorPagination(Builder $query, int $perPage = 15, ?string $cursor = null)
    {
        $perPage = max(1, min(100, $perPage)); // Limit between 1 and 100
        
        return $query->cursorPaginate($perPage, ['*'], 'cursor', $cursor);
    }

    /**
     * Get filter statistics for a board
     *
     * @param Board $board
     * @param array $filters
     * @return array
     */
    public function getFilterStatistics(Board $board, array $filters): array
    {
        $baseQuery = Task::where('board_id', $board->id);
        
        // Apply filters to get the filtered count
        $filteredQuery = clone $baseQuery;
        $this->applyFilters($filteredQuery, $board, $filters);
        $filteredCount = $filteredQuery->count();

        // Get total count for comparison
        $totalCount = $baseQuery->count();

        return [
            'total_tasks' => $totalCount,
            'filtered_tasks' => $filteredCount,
            'filter_efficiency' => $totalCount > 0 ? round(($filteredCount / $totalCount) * 100, 2) : 0,
            'filters_applied' => count($filters),
        ];
    }

    /**
     * Optimize query with proper indexes
     *
     * @param Builder $query
     * @param Board $board
     * @return Builder
     */
    public function optimizeQuery(Builder $query, Board $board): Builder
    {
        // Add hints for better query performance
        $query->where('tasks.board_id', $board->id)
              ->where('tasks.tenant_id', $board->tenant_id);

        // Suggest indexes for common filter combinations
        $this->logIndexSuggestions($board, $query);

        return $query;
    }

    /**
     * Log index suggestions for query optimization
     *
     * @param Board $board
     * @param Builder $query
     */
    protected function logIndexSuggestions(Board $board, Builder $query): void
    {
        // This would typically be used in a development/monitoring context
        // to suggest indexes based on query patterns
        
        $suggestedIndexes = [
            'tasks_board_tenant_index' => 'CREATE INDEX idx_tasks_board_tenant ON tasks (board_id, tenant_id)',
            'task_field_values_task_column_index' => 'CREATE INDEX idx_task_field_values_task_column ON task_field_values (task_id, board_column_id)',
            'task_field_values_value_index' => 'CREATE INDEX idx_task_field_values_value ON task_field_values ((value->>"$.value"))',
        ];

        Log::debug('Index suggestions for task filtering', [
            'board_id' => $board->id,
            'suggested_indexes' => $suggestedIndexes,
        ]);
    }

    /**
     * Get available columns for filtering in a board
     *
     * @param Board $board
     * @return array
     */
    public function getAvailableFilterColumns(Board $board): array
    {
        $columns = [];

        // Add standard task columns
        $standardColumns = [
            ['name' => 'title', 'type' => 'text', 'label' => 'Title'],
            ['name' => 'description', 'type' => 'long_text', 'label' => 'Description'],
            ['name' => 'status', 'type' => 'status', 'label' => 'Status'],
            ['name' => 'priority', 'type' => 'priority', 'label' => 'Priority'],
            ['name' => 'assignee_id', 'type' => 'assignee', 'label' => 'Assignee'],
            ['name' => 'due_date', 'type' => 'date', 'label' => 'Due Date'],
            ['name' => 'created_at', 'type' => 'datetime', 'label' => 'Created At'],
            ['name' => 'updated_at', 'type' => 'datetime', 'label' => 'Updated At'],
        ];

        $columns = array_merge($columns, $standardColumns);

        // Add dynamic board columns
        $boardColumns = $board->columns()->orderBy('position')->get()->map(function ($column) {
            return [
                'name' => $column->name,
                'type' => $column->type,
                'label' => $column->name,
                'id' => $column->id,
                'options' => $column->options,
            ];
        })->toArray();

        $columns = array_merge($columns, $boardColumns);

        return $columns;
    }

    /**
     * Validate filter combinations for potential conflicts
     *
     * @param array $filters
     * @return array
     */
    public function validateFilterCombinations(array $filters): array
    {
        $warnings = [];
        $conflicts = [];

        // Check for conflicting status filters
        $statusFilters = $this->extractFiltersByColumn($filters, 'status');
        if (count($statusFilters) > 1) {
            $conflicts[] = 'Multiple status filters detected - they may conflict with each other';
        }

        // Check for conflicting priority filters
        $priorityFilters = $this->extractFiltersByColumn($filters, 'priority');
        if (count($priorityFilters) > 1) {
            $conflicts[] = 'Multiple priority filters detected - they may conflict with each other';
        }

        // Check for performance-intensive filter combinations
        $textFilters = $this->extractFiltersByColumnType($filters, ['text', 'long_text']);
        if (count($textFilters) > 3) {
            $warnings[] = 'Multiple text filters may impact performance';
        }

        return [
            'warnings' => $warnings,
            'conflicts' => $conflicts,
            'is_valid' => empty($conflicts),
        ];
    }

    /**
     * Extract filters by column name
     *
     * @param array $filters
     * @param string $column
     * @return array
     */
    protected function extractFiltersByColumn(array $filters, string $column): array
    {
        $result = [];
        
        foreach ($filters as $filter) {
            if ($filter['type'] === 'group') {
                $result = array_merge($result, $this->extractFiltersByColumn($filter['filters'], $column));
            } elseif ($filter['column'] === $column) {
                $result[] = $filter;
            }
        }
        
        return $result;
    }

    /**
     * Extract filters by column type
     *
     * @param array $filters
     * @param array $columnTypes
     * @return array
     */
    protected function extractFiltersByColumnType(array $filters, array $columnTypes): array
    {
        $result = [];
        
        foreach ($filters as $filter) {
            if ($filter['type'] === 'group') {
                $result = array_merge($result, $this->extractFiltersByColumnType($filter['filters'], $columnTypes));
            } elseif (in_array($filter['column_type'], $columnTypes)) {
                $result[] = $filter;
            }
        }
        
        return $result;
    }
}