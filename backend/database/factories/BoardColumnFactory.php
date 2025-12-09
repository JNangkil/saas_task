<?php

namespace Database\Factories;

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\BoardColumn>
 */
class BoardColumnFactory extends Factory
{
    protected $model = BoardColumn::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $workspace = Workspace::factory()->create();
        $board = Board::factory()->create(['workspace_id' => $workspace->id]);

        return [
            'board_id' => $board->id,
            'name' => $this->faker->unique()->words(2, true),
            'type' => $this->faker->randomElement([
                'text', 'textarea', 'email', 'url', 'number',
                'date', 'datetime', 'boolean', 'checkbox',
                'select', 'multiselect', 'file', 'user'
            ]),
            'position' => $this->faker->unique()->randomFloat(4, 1000, 9999),
            'width' => $this->faker->randomFloat(4, 100, 500),
            'is_pinned' => $this->faker->boolean(20),
            'is_required' => $this->faker->boolean(30),
            'options' => $this->generateOptions(),
        ];
    }

    /**
     * Generate options based on column type.
     */
    protected function generateOptions(): array
    {
        $type = $this->faker->randomElement([
            'text', 'textarea', 'email', 'url', 'number',
            'date', 'datetime', 'boolean', 'checkbox',
            'select', 'multiselect', 'file', 'user'
        ]);

        return match ($type) {
            'text' => [
                'placeholder' => $this->faker->sentence(3),
                'max_length' => $this->faker->numberBetween(50, 500),
            ],
            'textarea' => [
                'placeholder' => $this->faker->sentence(3),
                'max_length' => $this->faker->numberBetween(500, 5000),
                'rows' => $this->faker->numberBetween(2, 10),
                'allow_html' => $this->faker->boolean(20),
            ],
            'email' => [
                'placeholder' => 'Enter email address...',
            ],
            'url' => [
                'placeholder' => 'https://example.com',
            ],
            'number' => [
                'min' => $this->faker->numberBetween(0, 100),
                'max' => $this->faker->numberBetween(1000, 10000),
                'default' => $this->faker->numberBetween(0, 100),
                'step' => $this->faker->randomElement([1, 0.1, 0.01]),
                'decimal_places' => $this->faker->numberBetween(0, 2),
            ],
            'date' => [
                'include_time' => false,
                'allow_past' => true,
                'allow_future' => true,
            ],
            'datetime' => [
                'include_time' => true,
                'allow_past' => true,
                'allow_future' => true,
                'format' => 'YYYY-MM-DD HH:mm',
            ],
            'boolean', 'checkbox' => [
                'default' => $this->faker->boolean(50),
                'label' => $this->faker->boolean(50) ? 'Yes' : 'Enable',
            ],
            'select' => [
                'choices' => $this->generateSelectChoices(),
                'default' => null,
                'allow_custom' => false,
            ],
            'multiselect' => [
                'choices' => $this->generateSelectChoices(),
                'allow_custom' => $this->faker->boolean(30),
                'max_selections' => $this->faker->numberBetween(2, 10),
            ],
            'file' => [
                'max_size' => $this->faker->randomElement([1024, 5120, 10240]), // KB
                'allowed_types' => $this->faker->randomElements([
                    'image/*', 'application/pdf', '.doc,.docx', '.xls,.xlsx'
                ], $this->faker->numberBetween(1, 3)),
                'multiple' => $this->faker->boolean(30),
            ],
            'user' => [
                'allow_multiple' => $this->faker->boolean(30),
                'include_unassigned' => true,
                'filter_by_workspace' => true,
                'filter_by_role' => $this->faker->boolean(20) ? ['member', 'owner'] : null,
            ],
            default => [],
        };
    }

    /**
     * Generate select choices.
     */
    protected function generateSelectChoices(): array
    {
        $choices = [];
        $count = $this->faker->numberBetween(3, 8);

        for ($i = 0; $i < $count; $i++) {
            $choices[] = [
                'value' => $this->faker->unique()->slug(2),
                'label' => $this->faker->words(2, true),
                'color' => $this->faker->hexColor(),
            ];
        }

        return $choices;
    }

    /**
     * Create a column for a specific board.
     */
    public function forBoard(Board $board): static
    {
        return $this->state(fn (array $attributes) => [
            'board_id' => $board->id,
        ]);
    }

    /**
     * Create a text column.
     */
    public function text(array $options = null): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $attributes['name'] ?? 'Text Column',
            'type' => 'text',
            'options' => $options ?? [
                'placeholder' => 'Enter text...',
                'max_length' => 255,
            ],
        ]);
    }

    /**
     * Create a textarea column.
     */
    public function textarea(array $options = null): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $attributes['name'] ?? 'Description',
            'type' => 'textarea',
            'options' => $options ?? [
                'placeholder' => 'Enter description...',
                'max_length' => 2000,
                'rows' => 3,
                'allow_html' => false,
            ],
        ]);
    }

    /**
     * Create a select column.
     */
    public function select(array $choices = null, array $options = null): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $attributes['name'] ?? 'Select Option',
            'type' => 'select',
            'options' => $options ?? [
                'choices' => $choices ?? [
                    ['value' => 'option1', 'label' => 'Option 1', 'color' => '#6B7280'],
                    ['value' => 'option2', 'label' => 'Option 2', 'color' => '#3B82F6'],
                    ['value' => 'option3', 'label' => 'Option 3', 'color' => '#10B981'],
                ],
                'default' => null,
                'allow_custom' => false,
            ],
        ]);
    }

    /**
     * Create a multiselect column.
     */
    public function multiselect(array $choices = null, array $options = null): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $attributes['name'] ?? 'Tags',
            'type' => 'multiselect',
            'options' => $options ?? [
                'choices' => $choices ?? [
                    ['value' => 'tag1', 'label' => 'Tag 1', 'color' => '#EF4444'],
                    ['value' => 'tag2', 'label' => 'Tag 2', 'color' => '#F59E0B'],
                    ['value' => 'tag3', 'label' => 'Tag 3', 'color' => '#10B981'],
                ],
                'allow_custom' => true,
                'max_selections' => 5,
            ],
        ]);
    }

    /**
     * Create a number column.
     */
    public function number(array $options = null): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $attributes['name'] ?? 'Number',
            'type' => 'number',
            'options' => $options ?? [
                'min' => 0,
                'max' => 100,
                'default' => 0,
                'step' => 1,
                'decimal_places' => 0,
            ],
        ]);
    }

    /**
     * Create a date column.
     */
    public function date(array $options = null): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $attributes['name'] ?? 'Date',
            'type' => 'date',
            'options' => $options ?? [
                'include_time' => false,
                'allow_past' => true,
                'allow_future' => true,
            ],
        ]);
    }

    /**
     * Create a user column.
     */
    public function user(array $options = null): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $attributes['name'] ?? 'Assignee',
            'type' => 'user',
            'options' => $options ?? [
                'allow_multiple' => false,
                'include_unassigned' => true,
                'filter_by_workspace' => true,
            ],
        ]);
    }

    /**
     * Create a boolean/checkbox column.
     */
    public function boolean(array $options = null): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => $attributes['name'] ?? 'Enabled',
            'type' => 'boolean',
            'options' => $options ?? [
                'default' => false,
                'label' => 'Yes',
            ],
        ]);
    }

    /**
     * Create a pinned column.
     */
    public function pinned(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_pinned' => true,
        ]);
    }

    /**
     * Create a required column.
     */
    public function required(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_required' => true,
        ]);
    }

    /**
     * Create the default title column.
     */
    public function title(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Title',
            'type' => 'text',
            'position' => 1000,
            'width' => 300,
            'is_pinned' => true,
            'is_required' => true,
            'options' => [
                'placeholder' => 'Enter task title...',
                'max_length' => 255,
            ],
        ]);
    }

    /**
     * Create the default status column.
     */
    public function status(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Status',
            'type' => 'select',
            'position' => 2000,
            'width' => 150,
            'is_pinned' => true,
            'is_required' => true,
            'options' => [
                'choices' => [
                    ['value' => 'todo', 'label' => 'To Do', 'color' => '#6B7280'],
                    ['value' => 'in_progress', 'label' => 'In Progress', 'color' => '#3B82F6'],
                    ['value' => 'review', 'label' => 'Review', 'color' => '#F59E0B'],
                    ['value' => 'done', 'label' => 'Done', 'color' => '#10B981'],
                ],
                'default' => 'todo',
                'allow_custom' => false,
            ],
        ]);
    }

    /**
     * Create the default priority column.
     */
    public function priority(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Priority',
            'type' => 'select',
            'position' => 3000,
            'width' => 120,
            'is_pinned' => true,
            'is_required' => true,
            'options' => [
                'choices' => [
                    ['value' => 'low', 'label' => 'Low', 'color' => '#6B7280'],
                    ['value' => 'medium', 'label' => 'Medium', 'color' => '#F59E0B'],
                    ['value' => 'high', 'label' => 'High', 'color' => '#EF4444'],
                    ['value' => 'urgent', 'label' => 'Urgent', 'color' => '#DC2626'],
                ],
                'default' => 'medium',
                'allow_custom' => false,
            ],
        ]);
    }

    /**
     * Create the default assignee column.
     */
    public function assignee(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Assignee',
            'type' => 'user',
            'position' => 4000,
            'width' => 200,
            'is_pinned' => false,
            'is_required' => false,
            'options' => [
                'allow_multiple' => false,
                'include_unassigned' => true,
                'filter_by_workspace' => true,
            ],
        ]);
    }

    /**
     * Create the default due date column.
     */
    public function dueDate(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Due Date',
            'type' => 'date',
            'position' => 5000,
            'width' => 140,
            'is_pinned' => false,
            'is_required' => false,
            'options' => [
                'include_time' => false,
                'allow_past' => true,
                'reminders' => [
                    ['type' => 'email', 'offset' => '-1 day'],
                    ['type' => 'notification', 'offset' => '-1 hour'],
                ],
            ],
        ]);
    }

    /**
     * Create a set of default columns for a board.
     */
    public static function createDefaultSet(Board $board): array
    {
        $columns = [];

        $columns[] = static::factory()->title()->forBoard($board)->create();
        $columns[] = static::factory()->status()->forBoard($board)->create();
        $columns[] = static::factory()->priority()->forBoard($board)->create();
        $columns[] = static::factory()->assignee()->forBoard($board)->create();
        $columns[] = static::factory()->dueDate()->forBoard($board)->create();

        return $columns;
    }
}