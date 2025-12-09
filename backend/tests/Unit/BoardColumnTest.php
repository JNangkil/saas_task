<?php

namespace Tests\Unit;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\User;
use App\Models\Workspace;
use App\Models\Task;
use App\Models\TaskFieldValue;
use App\Models\UserBoardPreference;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardColumnTest extends TestCase
{
    use RefreshDatabase;

    protected $workspace;
    protected $board;
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->workspace = Workspace::factory()->create();
        $this->board = Board::factory()->create(['workspace_id' => $this->workspace->id]);
        $this->user = User::factory()->create(['tenant_id' => $this->workspace->tenant_id]);
    }

    /** @test */
    public function it_can_create_a_board_column()
    {
        $columnData = [
            'name' => 'Test Column',
            'type' => 'text',
            'position' => 1000,
            'width' => 200,
            'is_pinned' => false,
            'is_required' => true,
            'options' => [
                'placeholder' => 'Enter text...',
                'max_length' => 255,
            ],
        ];

        $column = BoardColumn::factory()->create($columnData);

        $this->assertInstanceOf(BoardColumn::class, $column);
        $this->assertEquals($columnData['name'], $column->name);
        $this->assertEquals($columnData['type'], $column->type);
        $this->assertEquals($columnData['position'], $column->position);
        $this->assertEquals($columnData['width'], $column->width);
        $this->assertEquals($columnData['is_pinned'], $column->is_pinned);
        $this->assertEquals($columnData['is_required'], $column->is_required);
        $this->assertEquals($columnData['options'], $column->options);
    }

    /** @test */
    public function it_has_proper_relationships()
    {
        $column = BoardColumn::factory()->create(['board_id' => $this->board->id]);

        // Test board relationship
        $this->assertInstanceOf(Board::class, $column->board);
        $this->assertEquals($this->board->id, $column->board->id);

        // Test task field values relationship
        $task = Task::factory()->create(['board_id' => $this->board->id]);
        TaskFieldValue::factory()->create([
            'task_id' => $task->id,
            'board_column_id' => $column->id,
        ]);

        $this->assertCount(1, $column->taskFieldValues);
        $this->assertInstanceOf(TaskFieldValue::class, $column->taskFieldValues->first());
    }

    /** @test */
    public function it_can_scope_columns_by_type()
    {
        BoardColumn::factory()->create(['board_id' => $this->board->id, 'type' => 'text']);
        BoardColumn::factory()->create(['board_id' => $this->board->id, 'type' => 'select']);
        BoardColumn::factory()->create(['board_id' => $this->board->id, 'type' => 'text']);
        BoardColumn::factory()->create(['board_id' => $this->board->id, 'type' => 'number']);

        $textColumns = BoardColumn::ofType('text')->get();
        $selectColumns = BoardColumn::ofType('select')->get();

        $this->assertCount(2, $textColumns);
        $this->assertCount(1, $selectColumns);
        $textColumns->each(function ($column) {
            $this->assertEquals('text', $column->type);
        });
    }

    /** @test */
    public function it_can_scope_pinned_columns()
    {
        BoardColumn::factory()->create(['board_id' => $this->board->id, 'is_pinned' => true]);
        BoardColumn::factory()->create(['board_id' => $this->board->id, 'is_pinned' => false]);
        BoardColumn::factory()->create(['board_id' => $this->board->id, 'is_pinned' => true]);

        $pinnedColumns = BoardColumn::pinned()->get();

        $this->assertCount(2, $pinnedColumns);
        $pinnedColumns->each(function ($column) {
            $this->assertTrue($column->is_pinned);
        });
    }

    /** @test */
    public function it_can_scope_required_columns()
    {
        BoardColumn::factory()->create(['board_id' => $this->board->id, 'is_required' => true]);
        BoardColumn::factory()->create(['board_id' => $this->board->id, 'is_required' => false]);
        BoardColumn::factory()->create(['board_id' => $this->board->id, 'is_required' => true]);

        $requiredColumns = BoardColumn::required()->get();

        $this->assertCount(2, $requiredColumns);
        $requiredColumns->each(function ($column) {
            $this->assertTrue($column->is_required);
        });
    }

    /** @test */
    public function it_can_scope_ordered_columns()
    {
        $column3 = BoardColumn::factory()->create(['board_id' => $this->board->id, 'position' => 3000]);
        $column1 = BoardColumn::factory()->create(['board_id' => $this->board->id, 'position' => 1000]);
        $column2 = BoardColumn::factory()->create(['board_id' => $this->board->id, 'position' => 2000]);

        $orderedColumns = BoardColumn::ordered()->get();

        $this->assertEquals($column1->id, $orderedColumns->first()->id);
        $this->assertEquals($column2->id, $orderedColumns->skip(1)->first()->id);
        $this->assertEquals($column3->id, $orderedColumns->last()->id);
    }

    /** @test */
    public function it_can_check_column_type()
    {
        $column = BoardColumn::factory()->create(['board_id' => $this->board->id, 'type' => 'text']);

        $this->assertTrue($column->isType('text'));
        $this->assertFalse($column->isType('select'));
        $this->assertFalse($column->isType('number'));
    }

    /** @test */
    public function it_can_check_if_column_supports_multiple_values()
    {
        $textColumn = BoardColumn::factory()->text()->create(['board_id' => $this->board->id]);
        $selectColumn = BoardColumn::factory()->select()->create(['board_id' => $this->board->id]);
        $multiselectColumn = BoardColumn::factory()->multiselect()->create(['board_id' => $this->board->id]);
        $checkboxColumn = BoardColumn::factory()->boolean()->create(['board_id' => $this->board->id]);

        $this->assertFalse($textColumn->supportsMultipleValues());
        $this->assertTrue($selectColumn->supportsMultipleValues());
        $this->assertTrue($multiselectColumn->supportsMultipleValues());
        $this->assertTrue($checkboxColumn->supportsMultipleValues());
    }

    /** @test */
    public function it_returns_default_values_for_column_types()
    {
        $textColumn = BoardColumn::factory()->text()->create(['board_id' => $this->board->id]);
        $numberColumn = BoardColumn::factory()->number()->create(['board_id' => $this->board->id]);
        $dateColumn = BoardColumn::factory()->date()->create(['board_id' => $this->board->id]);
        $booleanColumn = BoardColumn::factory()->boolean()->create(['board_id' => $this->board->id]);
        $selectColumn = BoardColumn::factory()->select()->create(['board_id' => $this->board->id]);
        $multiselectColumn = BoardColumn::factory()->multiselect()->create(['board_id' => $this->board->id]);

        $this->assertEquals('', $textColumn->getDefaultValue());
        $this->assertEquals(0, $numberColumn->getDefaultValue());
        $this->assertNull($dateColumn->getDefaultValue());
        $this->assertFalse($booleanColumn->getDefaultValue());
        $this->assertNull($selectColumn->getDefaultValue());
        $this->assertEquals([], $multiselectColumn->getDefaultValue());
    }

    /** @test */
    public function it_returns_validation_rules_for_column_types()
    {
        $requiredTextColumn = BoardColumn::factory()->text()->required()->create(['board_id' => $this->board->id]);
        $optionalTextColumn = BoardColumn::factory()->text()->create(['board_id' => $this->board->id]);
        $emailColumn = BoardColumn::factory()->text()->create(['board_id' => $this->board->id, 'type' => 'email']);
        $numberColumn = BoardColumn::factory()->number()->create(['board_id' => $this->board->id]);

        $requiredTextRules = $requiredTextColumn->getValidationRules();
        $optionalTextRules = $optionalTextColumn->getValidationRules();
        $emailRules = $emailColumn->getValidationRules();
        $numberRules = $numberColumn->getValidationRules();

        $this->assertContains('required', $requiredTextRules);
        $this->assertContains('string', $requiredTextRules);
        $this->assertContains('nullable', $optionalTextRules);
        $this->assertContains('email', $emailRules);
        $this->assertContains('numeric', $numberRules);
    }

    /** @test */
    public function it_can_pin_and_unpin_columns()
    {
        $column = BoardColumn::factory()->create(['board_id' => $this->board->id, 'is_pinned' => false]);

        $this->assertFalse($column->is_pinned);

        $column->pin();
        $column->refresh();
        $this->assertTrue($column->is_pinned);

        $column->unpin();
        $column->refresh();
        $this->assertFalse($column->is_pinned);
    }

    /** @test */
    public function it_can_make_columns_required_or_optional()
    {
        $column = BoardColumn::factory()->create(['board_id' => $this->board->id, 'is_required' => false]);

        $this->assertFalse($column->is_required);

        $column->makeRequired();
        $column->refresh();
        $this->assertTrue($column->is_required);

        $column->makeOptional();
        $column->refresh();
        $this->assertFalse($column->is_required);
    }

    /** @test */
    public function it_validates_select_column_values()
    {
        $choices = [
            ['value' => 'option1', 'label' => 'Option 1'],
            ['value' => 'option2', 'label' => 'Option 2'],
        ];

        $column = BoardColumn::factory()->select($choices)->create(['board_id' => $this->board->id]);

        // Valid choice
        $validValue = TaskFieldValue::factory()
            ->forColumn($column)
            ->withValue('option1')
            ->create();

        $this->assertTrue($validValue->validateValue());

        // Invalid choice
        $invalidValue = TaskFieldValue::factory()
            ->forColumn($column)
            ->withValue('invalid_option')
            ->create();

        $this->assertFalse($invalidValue->validateValue());
    }

    /** @test */
    public function it_validates_multiselect_column_values()
    {
        $choices = [
            ['value' => 'tag1', 'label' => 'Tag 1'],
            ['value' => 'tag2', 'label' => 'Tag 2'],
            ['value' => 'tag3', 'label' => 'Tag 3'],
        ];

        $column = BoardColumn::factory()->multiselect($choices)->create(['board_id' => $this->board->id]);

        // Valid choices
        $validValue = TaskFieldValue::factory()
            ->forColumn($column)
            ->multiselect(['tag1', 'tag3'])
            ->create();

        $this->assertTrue($validValue->validateValue());

        // Invalid choice
        $invalidValue = TaskFieldValue::factory()
            ->forColumn($column)
            ->multiselect(['tag1', 'invalid_tag'])
            ->create();

        $this->assertFalse($invalidValue->validateValue());
    }

    /** @test */
    public function it_validates_email_column_values()
    {
        $column = BoardColumn::factory()->create([
            'board_id' => $this->board->id,
            'type' => 'email',
        ]);

        // Valid email
        $validEmail = TaskFieldValue::factory()
            ->forColumn($column)
            ->withValue('test@example.com')
            ->create();

        $this->assertTrue($validEmail->validateValue());

        // Invalid email
        $invalidEmail = TaskFieldValue::factory()
            ->forColumn($column)
            ->withValue('invalid-email')
            ->create();

        $this->assertFalse($invalidEmail->validateValue());
    }

    /** @test */
    public function it_validates_url_column_values()
    {
        $column = BoardColumn::factory()->create([
            'board_id' => $this->board->id,
            'type' => 'url',
        ]);

        // Valid URL
        $validUrl = TaskFieldValue::factory()
            ->forColumn($column)
            ->withValue('https://example.com')
            ->create();

        $this->assertTrue($validUrl->validateValue());

        // Invalid URL
        $invalidUrl = TaskFieldValue::factory()
            ->forColumn($column)
            ->withValue('not-a-url')
            ->create();

        $this->assertFalse($invalidUrl->validateValue());
    }

    /** @test */
    public function it_validates_required_columns()
    {
        $requiredColumn = BoardColumn::factory()->required()->create(['board_id' => $this->board->id]);
        $optionalColumn = BoardColumn::factory()->create(['board_id' => $this->board->id]);

        // Required column with value
        $requiredWithValue = TaskFieldValue::factory()
            ->forColumn($requiredColumn)
            ->withValue('some value')
            ->create();

        $this->assertTrue($requiredWithValue->validateValue());

        // Required column without value
        $requiredWithoutValue = TaskFieldValue::factory()
            ->forColumn($requiredColumn)
            ->empty()
            ->create();

        $this->assertFalse($requiredWithoutValue->validateValue());

        // Optional column without value
        $optionalWithoutValue = TaskFieldValue::factory()
            ->forColumn($optionalColumn)
            ->empty()
            ->create();

        $this->assertTrue($optionalWithoutValue->validateValue());
    }

    /** @test */
    public function it_can_create_default_column_set()
    {
        $columns = BoardColumn::factory()->createDefaultSet($this->board);

        $this->assertCount(5, $columns);
        $this->assertEquals('Title', $columns[0]->name);
        $this->assertEquals('Status', $columns[1]->name);
        $this->assertEquals('Priority', $columns[2]->name);
        $this->assertEquals('Assignee', $columns[3]->name);
        $this->assertEquals('Due Date', $columns[4]->name);

        // Check that title column is required and pinned
        $titleColumn = $columns->firstWhere('name', 'Title');
        $this->assertTrue($titleColumn->is_required);
        $this->assertTrue($titleColumn->is_pinned);
    }

    /** @test */
    public function it_can_create_text_column_with_factory()
    {
        $column = BoardColumn::factory()->text([
            'placeholder' => 'Custom placeholder',
            'max_length' => 500,
        ])->create(['board_id' => $this->board->id]);

        $this->assertEquals('text', $column->type);
        $this->assertEquals('Custom placeholder', $column->options['placeholder']);
        $this->assertEquals(500, $column->options['max_length']);
    }

    /** @test */
    public function it_can_create_select_column_with_factory()
    {
        $choices = [
            ['value' => 'low', 'label' => 'Low Priority', 'color' => '#6B7280'],
            ['value' => 'high', 'label' => 'High Priority', 'color' => '#EF4444'],
        ];

        $column = BoardColumn::factory()->select($choices, ['allow_custom' => true])
            ->create(['board_id' => $this->board->id]);

        $this->assertEquals('select', $column->type);
        $this->assertEquals($choices, $column->options['choices']);
        $this->assertTrue($column->options['allow_custom']);
    }

    /** @test */
    public function it_can_create_number_column_with_factory()
    {
        $column = BoardColumn::factory()->number([
            'min' => 0,
            'max' => 100,
            'step' => 0.5,
        ])->create(['board_id' => $this->board->id]);

        $this->assertEquals('number', $column->type);
        $this->assertEquals(0, $column->options['min']);
        $this->assertEquals(100, $column->options['max']);
        $this->assertEquals(0.5, $column->options['step']);
    }

    /** @test */
    public function it_handles_user_board_preferences()
    {
        $column = BoardColumn::factory()->create(['board_id' => $this->board->id]);
        $preference = UserBoardPreference::factory()
            ->forUser($this->user)
            ->forBoard($this->board)
            ->create([
                'column_preferences' => [
                    $column->id => [
                        'visible' => false,
                        'width' => 250,
                        'position' => 5,
                    ],
                ],
            ]);

        $this->assertFalse($preference->isColumnVisible($column->id));
        $this->assertEquals(250, $preference->getColumnWidth($column->id));
        $this->assertEquals(5, $preference->getColumnPosition($column->id));
    }

    /** @test */
    public function it_can_delete_column_without_affecting_others()
    {
        $column1 = BoardColumn::factory()->create(['board_id' => $this->board->id]);
        $column2 = BoardColumn::factory()->create(['board_id' => $this->board->id]);

        // Create task field values for both columns
        $task = Task::factory()->create(['board_id' => $this->board->id]);
        TaskFieldValue::factory()->create(['task_id' => $task->id, 'board_column_id' => $column1->id]);
        TaskFieldValue::factory()->create(['task_id' => $task->id, 'board_column_id' => $column2->id]);

        $this->assertEquals(2, TaskFieldValue::count());

        // Delete first column
        $column1->delete();

        // Check that column 2 and its field value still exist
        $this->assertDatabaseMissing('board_columns', ['id' => $column1->id]);
        $this->assertDatabaseHas('board_columns', ['id' => $column2->id]);
        $this->assertEquals(1, TaskFieldValue::count());
        $this->assertDatabaseHas('task_field_values', ['board_column_id' => $column2->id]);
    }

    /** @test */
    public function it_cannot_create_duplicate_column_names_in_same_board()
    {
        $columnData = [
            'board_id' => $this->board->id,
            'name' => 'Duplicate Name',
            'type' => 'text',
            'position' => 1000,
        ];

        BoardColumn::factory()->create($columnData);

        $this->expectException(\Illuminate\Database\QueryException::class);
        BoardColumn::factory()->create($columnData);
    }

    /** @test */
    public function it_can_create_columns_with_same_name_in_different_boards()
    {
        $board2 = Board::factory()->create(['workspace_id' => $this->workspace->id]);
        $columnName = 'Same Name';

        $column1 = BoardColumn::factory()->create([
            'board_id' => $this->board->id,
            'name' => $columnName,
            'type' => 'text',
        ]);

        $column2 = BoardColumn::factory()->create([
            'board_id' => $board2->id,
            'name' => $columnName,
            'type' => 'text',
        ]);

        $this->assertDatabaseHas('board_columns', ['id' => $column1->id, 'name' => $columnName]);
        $this->assertDatabaseHas('board_columns', ['id' => $column2->id, 'name' => $columnName]);
    }
}