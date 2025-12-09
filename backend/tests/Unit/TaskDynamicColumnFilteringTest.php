<?php

namespace Tests\Unit;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Task;
use App\Models\TaskFieldValue;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Label;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskDynamicColumnFilteringTest extends TestCase
{
    use RefreshDatabase;

    protected $workspace;
    protected $board;
    protected $user;
    protected $columns;
    protected $tasks;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workspace = Workspace::factory()->create();
        $this->board = Board::factory()->create(['workspace_id' => $this->workspace->id]);
        $this->user = User::factory()->create(['tenant_id' => $this->workspace->tenant_id]);

        // Create dynamic columns
        $this->columns = [
            'text' => BoardColumn::factory()->text([
                'name' => 'Custom Text',
                'placeholder' => 'Enter custom text',
            ])->create(['board_id' => $this->board->id]),

            'number' => BoardColumn::factory()->number([
                'name' => 'Estimated Hours',
                'min' => 0,
                'max' => 100,
                'step' => 0.5,
            ])->create(['board_id' => $this->board->id]),

            'select' => BoardColumn::factory()->select([
                ['value' => 'feature', 'label' => 'Feature', 'color' => '#3B82F6'],
                ['value' => 'bug', 'label' => 'Bug', 'color' => '#EF4444'],
                ['value' => 'enhancement', 'label' => 'Enhancement', 'color' => '#10B981'],
            ])->create(['board_id' => $this->board->id]),

            'multiselect' => BoardColumn::factory()->multiselect([
                ['value' => 'frontend', 'label' => 'Frontend', 'color' => '#F59E0B'],
                ['value' => 'backend', 'label' => 'Backend', 'color' => '#8B5CF6'],
                ['value' => 'database', 'label' => 'Database', 'color' => '#10B981'],
                ['value' => 'devops', 'label' => 'DevOps', 'color' => '#6B7280'],
            ])->create(['board_id' => $this->board->id]),

            'date' => BoardColumn::factory()->date([
                'name' => 'Milestone Date',
                'include_time' => false,
            ])->create(['board_id' => $this->board->id]),

            'boolean' => BoardColumn::factory()->boolean([
                'name' => 'Requires Review',
            ])->create(['board_id' => $this->board->id]),
        ];

        // Create tasks with different field values
        $this->tasks = collect([
            $this->createTaskWithFieldValues('Task 1', [
                'text' => 'Important feature request',
                'number' => 20,
                'select' => 'feature',
                'multiselect' => ['frontend', 'backend'],
                'date' => Carbon::parse('+2 weeks')->toDateString(),
                'boolean' => true,
            ]),

            $this->createTaskWithFieldValues('Task 2', [
                'text' => 'Critical bug fix',
                'number' => 8,
                'select' => 'bug',
                'multiselect' => ['backend'],
                'date' => Carbon::parse('+3 days')->toDateString(),
                'boolean' => true,
            ]),

            $this->createTaskWithFieldValues('Task 3', [
                'text' => 'Performance enhancement',
                'number' => 40,
                'select' => 'enhancement',
                'multiselect' => ['frontend', 'database'],
                'date' => Carbon::parse('+1 month')->toDateString(),
                'boolean' => false,
            ]),

            $this->createTaskWithFieldValues('Task 4', [
                'text' => 'Database migration',
                'number' => 16,
                'select' => 'feature',
                'multiselect' => ['database', 'devops'],
                'date' => Carbon::parse('-1 week')->toDateString(),
                'boolean' => true,
            ]),

            $this->createTaskWithFieldValues('Task 5', [
                'text' => 'CI/CD pipeline setup',
                'number' => 12,
                'select' => 'enhancement',
                'multiselect' => ['devops'],
                'date' => Carbon::parse('+5 days')->toDateString(),
                'boolean' => false,
            ]),
        ]);
    }

    /**
     * Helper to create a task with field values.
     */
    protected function createTaskWithFieldValues(string $title, array $fieldValues): Task
    {
        $task = Task::factory()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'title' => $title,
            'creator_id' => $this->user->id,
        ]);

        foreach ($fieldValues as $columnKey => $value) {
            TaskFieldValue::factory()->create([
                'task_id' => $task->id,
                'board_column_id' => $this->columns[$columnKey]->id,
                'value' => $value,
            ]);
        }

        return $task;
    }

    /** @test */
    public function it_can_filter_tasks_by_text_column_contains()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['text']->id,
                    'operator' => 'contains',
                    'value' => 'bug',
                ],
            ],
        ]);

        $this->assertCount(1, $results);
        $this->assertEquals('Task 2', $results->first()->title);
    }

    /** @test */
    public function it_can_filter_tasks_by_text_column_starts_with()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['text']->id,
                    'operator' => 'starts_with',
                    'value' => 'Performance',
                ],
            ],
        ]);

        $this->assertCount(1, $results);
        $this->assertEquals('Task 3', $results->first()->title);
    }

    /** @test */
    public function it_can_filter_tasks_by_text_column_ends_with()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['text']->id,
                    'operator' => 'ends_with',
                    'value' => 'setup',
                ],
            ],
        ]);

        $this->assertCount(1, $results);
        $this->assertEquals('Task 5', $results->first()->title);
    }

    /** @test */
    public function it_can_filter_tasks_by_number_column_equals()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['number']->id,
                    'operator' => 'equals',
                    'value' => 20,
                ],
            ],
        ]);

        $this->assertCount(1, $results);
        $this->assertEquals('Task 1', $results->first()->title);
    }

    /** @test */
    public function it_can_filter_tasks_by_number_column_greater_than()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['number']->id,
                    'operator' => 'greater_than',
                    'value' => 15,
                ],
            ],
        ]);

        $this->assertCount(3, $results);
        $this->assertEquals(['Task 1', 'Task 3', 'Task 4'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_number_column_between()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['number']->id,
                    'operator' => 'between',
                    'value' => [10, 25],
                ],
            ],
        ]);

        $this->assertCount(3, $results);
        $this->assertEquals(['Task 1', 'Task 4', 'Task 5'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_select_column_equals()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['select']->id,
                    'operator' => 'equals',
                    'value' => 'bug',
                ],
            ],
        ]);

        $this->assertCount(1, $results);
        $this->assertEquals('Task 2', $results->first()->title);
    }

    /** @test */
    public function it_can_filter_tasks_by_select_column_in()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['select']->id,
                    'operator' => 'in',
                    'value' => ['feature', 'enhancement'],
                ],
            ],
        ]);

        $this->assertCount(3, $results);
        $this->assertEquals(['Task 1', 'Task 3', 'Task 4'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_multiselect_column_contains()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['multiselect']->id,
                    'operator' => 'contains',
                    'value' => 'frontend',
                ],
            ],
        ]);

        $this->assertCount(2, $results);
        $this->assertEquals(['Task 1', 'Task 3'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_multiselect_column_contains_all()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['multiselect']->id,
                    'operator' => 'contains_all',
                    'value' => ['frontend', 'backend'],
                ],
            ],
        ]);

        $this->assertCount(1, $results);
        $this->assertEquals('Task 1', $results->first()->title);
    }

    /** @test */
    public function it_can_filter_tasks_by_multiselect_column_contains_any()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['multiselect']->id,
                    'operator' => 'contains_any',
                    'value' => ['database', 'devops'],
                ],
            ],
        ]);

        $this->assertCount(3, $results);
        $this->assertEquals(['Task 3', 'Task 4', 'Task 5'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_date_column_equals()
    {
        $targetDate = Carbon::parse('+2 weeks')->toDateString();

        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['date']->id,
                    'operator' => 'equals',
                    'value' => $targetDate,
                ],
            ],
        ]);

        $this->assertCount(1, $results);
        $this->assertEquals('Task 1', $results->first()->title);
    }

    /** @test */
    public function it_can_filter_tasks_by_date_column_after()
    {
        $filterDate = Carbon::parse('+1 week')->toDateString();

        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['date']->id,
                    'operator' => 'after',
                    'value' => $filterDate,
                ],
            ],
        ]);

        $this->assertCount(2, $results);
        $this->assertEquals(['Task 1', 'Task 3'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_date_column_before()
    {
        $filterDate = Carbon::parse('today')->toDateString();

        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['date']->id,
                    'operator' => 'before',
                    'value' => $filterDate,
                ],
            ],
        ]);

        $this->assertCount(1, $results);
        $this->assertEquals('Task 4', $results->first()->title);
    }

    /** @test */
    public function it_can_filter_tasks_by_date_column_between()
    {
        $startDate = Carbon::parse('today')->toDateString();
        $endDate = Carbon::parse('+2 weeks')->toDateString();

        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['date']->id,
                    'operator' => 'between',
                    'value' => [$startDate, $endDate],
                ],
            ],
        ]);

        $this->assertCount(2, $results);
        $this->assertEquals(['Task 1', 'Task 5'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_boolean_column_is_true()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['boolean']->id,
                    'operator' => 'is_true',
                    'value' => true,
                ],
            ],
        ]);

        $this->assertCount(3, $results);
        $this->assertEquals(['Task 1', 'Task 2', 'Task 4'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_boolean_column_is_false()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['boolean']->id,
                    'operator' => 'is_false',
                    'value' => false,
                ],
            ],
        ]);

        $this->assertCount(2, $results);
        $this->assertEquals(['Task 3', 'Task 5'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_multiple_column_filters_with_and_logic()
    {
        $results = $this->filterTasks([
            'column_filter_logic' => 'and',
            'column_filters' => [
                [
                    'column_id' => $this->columns['select']->id,
                    'operator' => 'equals',
                    'value' => 'feature',
                ],
                [
                    'column_id' => $this->columns['boolean']->id,
                    'operator' => 'is_true',
                    'value' => true,
                ],
            ],
        ]);

        $this->assertCount(2, $results);
        $this->assertEquals(['Task 1', 'Task 4'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_multiple_column_filters_with_or_logic()
    {
        $results = $this->filterTasks([
            'column_filter_logic' => 'or',
            'column_filters' => [
                [
                    'column_id' => $this->columns['number']->id,
                    'operator' => 'less_than',
                    'value' => 10,
                ],
                [
                    'column_id' => $this->columns['boolean']->id,
                    'operator' => 'is_false',
                    'value' => false,
                ],
            ],
        ]);

        $this->assertCount(3, $results);
        $this->assertEquals(['Task 2', 'Task 3', 'Task 5'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_with_complex_filter_groups()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['multiselect']->id,
                    'operator' => 'contains',
                    'value' => 'frontend',
                    'logic' => 'or',
                    'filters' => [
                        [
                            'column_id' => $this->columns['select']->id,
                            'operator' => 'equals',
                            'value' => 'bug',
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertCount(3, $results);
        $this->assertEquals(['Task 1', 'Task 2', 'Task 3'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_empty_values()
    {
        // Create a task with empty value
        $emptyTask = Task::factory()->create([
            'board_id' => $this->board->id,
            'workspace_id' => $this->workspace->id,
            'tenant_id' => $this->workspace->tenant_id,
            'title' => 'Empty Task',
            'creator_id' => $this->user->id,
        ]);

        TaskFieldValue::factory()->create([
            'task_id' => $emptyTask->id,
            'board_column_id' => $this->columns['text']->id,
            'value' => null,
        ]);

        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['text']->id,
                    'operator' => 'is_empty',
                    'value' => null,
                ],
            ],
        ]);

        $this->assertCount(1, $results);
        $this->assertEquals('Empty Task', $results->first()->title);
    }

    /** @test */
    public function it_can_filter_tasks_by_not_empty_values()
    {
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => $this->columns['text']->id,
                    'operator' => 'is_not_empty',
                    'value' => null,
                ],
            ],
        ]);

        $this->assertCount(5, $results);
        $this->assertEquals(['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_combined_with_standard_filters()
    {
        $results = $this->filterTasks([
            'status' => 'todo',
            'column_filters' => [
                [
                    'column_id' => $this->columns['boolean']->id,
                    'operator' => 'is_true',
                    'value' => true,
                ],
            ],
        ]);

        $this->assertCount(3, $results);
        // All tasks should have status 'todo' by default
        $this->assertEquals(['Task 1', 'Task 2', 'Task 4'], $results->pluck('title')->toArray());
    }

    /** @test */
    public function it_can_filter_tasks_by_column_type()
    {
        // Add a new text column
        $anotherTextColumn = BoardColumn::factory()->text([
            'name' => 'Notes',
        ])->create(['board_id' => $this->board->id]);

        // Create values for some tasks
        TaskFieldValue::factory()->create([
            'task_id' => $this->tasks[0]->id,
            'board_column_id' => $anotherTextColumn->id,
            'value' => 'Some notes',
        ]);

        TaskFieldValue::factory()->create([
            'task_id' => $this->tasks[1]->id,
            'board_column_id' => $anotherTextColumn->id,
            'value' => 'Other notes',
        ]);

        $results = TaskFieldValue::forColumnType('text')->get();

        $this->assertCount(7, $results); // 5 existing + 2 new
    }

    /** @test */
    public function it_can_sort_tasks_by_dynamic_column_values()
    {
        // Sort by number column ascending
        $results = $this->filterTasks([
            'sort_by' => 'column',
            'sort_column_id' => $this->columns['number']->id,
            'sort_direction' => 'asc',
        ]);

        $hours = $results->map(function ($task) {
            $fieldValue = $task->fieldValues()
                ->where('board_column_id', $this->columns['number']->id)
                ->first();
            return $fieldValue ? $fieldValue->getTypedValue() : 0;
        })->toArray();

        $this->assertEquals([8, 12, 16, 20, 40], $hours);
    }

    /** @test */
    public function it_can_sort_tasks_by_dynamic_column_values_descending()
    {
        // Sort by number column descending
        $results = $this->filterTasks([
            'sort_by' => 'column',
            'sort_column_id' => $this->columns['number']->id,
            'sort_direction' => 'desc',
        ]);

        $hours = $results->map(function ($task) {
            $fieldValue = $task->fieldValues()
                ->where('board_column_id', $this->columns['number']->id)
                ->first();
            return $fieldValue ? $fieldValue->getTypedValue() : 0;
        })->toArray();

        $this->assertEquals([40, 20, 16, 12, 8], $hours);
    }

    /** @test */
    public function it_handles_invalid_column_filter_gracefully()
    {
        // Non-existent column ID
        $results = $this->filterTasks([
            'column_filters' => [
                [
                    'column_id' => 99999,
                    'operator' => 'equals',
                    'value' => 'test',
                ],
            ],
        ]);

        $this->assertCount(5, $results); // Should return all tasks
    }

    /** @test */
    public function it_validates_column_filter_operators()
    {
        $validOperators = [
            'text' => ['equals', 'contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
            'number' => ['equals', 'greater_than', 'less_than', 'between', 'is_empty', 'is_not_empty'],
            'select' => ['equals', 'in', 'is_empty', 'is_not_empty'],
            'multiselect' => ['contains', 'contains_all', 'contains_any', 'is_empty', 'is_not_empty'],
            'date' => ['equals', 'after', 'before', 'between', 'is_empty', 'is_not_empty'],
            'boolean' => ['is_true', 'is_false', 'equals', 'is_empty', 'is_not_empty'],
        ];

        foreach ($this->columns as $type => $column) {
            $this->assertContains($column->type, array_keys($validOperators));

            // Test that each valid operator works
            foreach ($validOperators[$column->type] as $operator) {
                $filter = [
                    'column_id' => $column->id,
                    'operator' => $operator,
                    'value' => $this->getTestValueForOperator($operator, $type),
                ];

                // Should not throw an exception
                $this->filterTasks(['column_filters' => [$filter]]);
            }
        }
    }

    /**
     * Helper method to filter tasks based on dynamic column criteria.
     */
    protected function filterTasks(array $filters = [])
    {
        $query = Task::where('board_id', $this->board->id);

        // Apply column filters if present
        if (isset($filters['column_filters'])) {
            $filterLogic = $filters['column_filter_logic'] ?? 'and';

            $query->whereHas('fieldValues', function ($q) use ($filters, $filterLogic) {
                if ($filterLogic === 'and' && count($filters['column_filters']) > 1) {
                    $q->where(function ($subQuery) use ($filters) {
                        foreach ($filters['column_filters'] as $filter) {
                            $subQuery->orWhere(function ($conditionQuery) use ($filter) {
                                $this->applyColumnFilter($conditionQuery, $filter);
                            });
                        }
                    });
                } else {
                    foreach ($filters['column_filters'] as $filter) {
                        $this->applyColumnFilter($q, $filter);
                    }
                }
            });
        }

        // Apply standard filters
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Apply sorting
        if (isset($filters['sort_by']) && $filters['sort_by'] === 'column') {
            $columnId = $filters['sort_column_id'];
            $direction = $filters['sort_direction'] ?? 'asc';

            $query->orderBy(function ($q) use ($columnId) {
                $q->selectRaw('COALESCE(JSON_EXTRACT(value, "$"), 0)')
                  ->from('task_field_values')
                  ->whereColumn('task_field_values.task_id', 'tasks.id')
                  ->where('task_field_values.board_column_id', $columnId)
                  ->limit(1);
            }, $direction);
        }

        return $query->get();
    }

    /**
     * Apply a single column filter to the query.
     */
    protected function applyColumnFilter($query, array $filter)
    {
        $columnId = $filter['column_id'];
        $operator = $filter['operator'];
        $value = $filter['value'];

        $query->where('board_column_id', $columnId);

        switch ($operator) {
            case 'equals':
                if (is_array($value)) {
                    $query->whereIn('value', $value);
                } else {
                    $query->where('value', $value);
                }
                break;

            case 'contains':
                $query->where('value', 'like', '%' . $value . '%');
                break;

            case 'starts_with':
                $query->where('value', 'like', $value . '%');
                break;

            case 'ends_with':
                $query->where('value', 'like', '%' . $value);
                break;

            case 'greater_than':
                $query->whereRaw('CAST(value AS DECIMAL(10,2)) > ?', [$value]);
                break;

            case 'less_than':
                $query->whereRaw('CAST(value AS DECIMAL(10,2)) < ?', [$value]);
                break;

            case 'between':
                $query->whereRaw('CAST(value AS DECIMAL(10,2)) BETWEEN ? AND ?', [$value[0], $value[1]]);
                break;

            case 'contains_all':
                foreach ($value as $item) {
                    $query->whereJsonContains('value', $item);
                }
                break;

            case 'contains_any':
                $query->where(function ($q) use ($value) {
                    foreach ($value as $item) {
                        $q->orWhereJsonContains('value', $item);
                    }
                });
                break;

            case 'after':
                $query->whereDate('value', '>', $value);
                break;

            case 'before':
                $query->whereDate('value', '<', $value);
                break;

            case 'is_true':
                $query->where('value', true);
                break;

            case 'is_false':
                $query->where('value', false);
                break;

            case 'is_empty':
                $query->whereNull('value')->orWhere('value', '');
                break;

            case 'is_not_empty':
                $query->whereNotNull('value')->where('value', '!=', '');
                break;
        }
    }

    /**
     * Get a test value for a specific operator and column type.
     */
    protected function getTestValueForOperator(string $operator, string $type): mixed
    {
        return match ($operator) {
            'equals', 'contains', 'starts_with', 'ends_with' => 'test',
            'greater_than', 'less_than' => 10,
            'between' => [5, 15],
            'in' => ['test1', 'test2'],
            'contains', 'contains_all' => ['tag1', 'tag2'],
            'contains_any' => ['tag1', 'tag2', 'tag3'],
            'after', 'before' => Carbon::now()->toDateString(),
            'is_true', 'is_false' => $operator === 'is_true',
            default => null,
        };
    }
}