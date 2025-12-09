<?php

namespace Database\Factories;

use App\Models\Board;
use App\Models\User;
use App\Models\UserBoardPreference;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UserBoardPreference>
 */
class UserBoardPreferenceFactory extends Factory
{
    protected $model = UserBoardPreference::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $workspace = \App\Models\Workspace::factory()->create();
        $board = Board::factory()->create(['workspace_id' => $workspace->id]);
        $user = User::factory()->create(['tenant_id' => $workspace->tenant_id]);

        return [
            'user_id' => $user->id,
            'board_id' => $board->id,
            'column_preferences' => $this->generateColumnPreferences($board),
        ];
    }

    /**
     * Generate column preferences for a board.
     */
    protected function generateColumnPreferences(Board $board): array
    {
        $preferences = [];

        // Create default columns if board doesn't have any
        if ($board->columns->isEmpty()) {
            $columns = \Database\Factories\BoardColumnFactory::createDefaultSet($board);
        } else {
            $columns = $board->columns;
        }

        foreach ($columns as $index => $column) {
            $columnId = is_object($column) ? $column->id : $column;

            $preferences[$columnId] = [
                'visible' => $this->faker->boolean(90), // 90% chance of being visible
                'width' => $this->faker->boolean(50) ? $this->faker->randomFloat(4, 100, 500) : null,
                'position' => $this->faker->boolean(70) ? $index + 1 : null,
            ];
        }

        return $preferences;
    }

    /**
     * Create preferences for a specific user.
     */
    public function forUser(User $user): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $user->id,
            'board_id' => $attributes['board_id'] ?? Board::factory()->create(['workspace_id' => $user->workspaces()->first()->id]),
        ]);
    }

    /**
     * Create preferences for a specific board.
     */
    public function forBoard(Board $board): static
    {
        return $this->state(fn (array $attributes) => [
            'board_id' => $board->id,
            'user_id' => $attributes['user_id'] ?? User::factory()->create(['tenant_id' => $board->workspace->tenant_id]),
        ]);
    }

    /**
     * Create preferences with all columns visible.
     */
    public function allVisible(): static
    {
        return $this->state(fn (array $attributes) => [
            'column_preferences' => $this->generateAllVisiblePreferences($attributes['board_id']),
        ]);
    }

    /**
     * Create preferences with some columns hidden.
     */
    public function someHidden(float $hiddenRatio = 0.3): static
    {
        return $this->state(fn (array $attributes) => [
            'column_preferences' => $this->generateSomeHiddenPreferences($attributes['board_id'], $hiddenRatio),
        ]);
    }

    /**
     * Create preferences with custom column widths.
     */
    public function withCustomWidths(): static
    {
        return $this->state(fn (array $attributes) => [
            'column_preferences' => $this->generatePreferencesWithCustomWidths($attributes['board_id']),
        ]);
    }

    /**
     * Create preferences with custom column order.
     */
    public function withCustomOrder(): static
    {
        return $this->state(fn (array $attributes) => [
            'column_preferences' => $this->generatePreferencesWithCustomOrder($attributes['board_id']),
        ]);
    }

    /**
     * Create preferences for a minimal view (fewer visible columns).
     */
    public function minimalView(): static
    {
        return $this->state(fn (array $attributes) => [
            'column_preferences' => $this->generateMinimalViewPreferences($attributes['board_id']),
        ]);
    }

    /**
     * Create preferences for a detailed view (more visible columns).
     */
    public function detailedView(): static
    {
        return $this->state(fn (array $attributes) => [
            'column_preferences' => $this->generateDetailedViewPreferences($attributes['board_id']),
        ]);
    }

    /**
     * Generate preferences with all columns visible.
     */
    protected function generateAllVisiblePreferences($boardId): array
    {
        $board = Board::find($boardId);
        $preferences = [];
        $columns = $board->columns ?? [];

        foreach ($columns as $index => $column) {
            $preferences[$column->id] = [
                'visible' => true,
                'width' => $column->width,
                'position' => $index + 1,
            ];
        }

        return $preferences;
    }

    /**
     * Generate preferences with some columns hidden.
     */
    protected function generateSomeHiddenPreferences($boardId, float $hiddenRatio): array
    {
        $board = Board::find($boardId);
        $preferences = [];
        $columns = $board->columns ?? [];

        foreach ($columns as $index => $column) {
            $preferences[$column->id] = [
                'visible' => $this->faker->boolean((1 - $hiddenRatio) * 100),
                'width' => $column->width,
                'position' => $index + 1,
            ];
        }

        return $preferences;
    }

    /**
     * Generate preferences with custom column widths.
     */
    protected function generatePreferencesWithCustomWidths($boardId): array
    {
        $board = Board::find($boardId);
        $preferences = [];
        $columns = $board->columns ?? [];

        foreach ($columns as $index => $column) {
            $preferences[$column->id] = [
                'visible' => true,
                'width' => $this->faker->randomFloat(4, 100, 600),
                'position' => $index + 1,
            ];
        }

        return $preferences;
    }

    /**
     * Generate preferences with custom column order.
     */
    protected function generatePreferencesWithCustomOrder($boardId): array
    {
        $board = Board::find($boardId);
        $preferences = [];
        $columns = $board->columns ?? [];
        $shuffledPositions = range(1, count($columns));
        shuffle($shuffledPositions);

        foreach ($columns as $index => $column) {
            $preferences[$column->id] = [
                'visible' => true,
                'width' => $column->width,
                'position' => $shuffledPositions[$index],
            ];
        }

        return $preferences;
    }

    /**
     * Generate preferences for minimal view.
     */
    protected function generateMinimalViewPreferences($boardId): array
    {
        $board = Board::find($boardId);
        $preferences = [];
        $columns = $board->columns ?? [];

        // Only show essential columns
        $essentialColumns = ['Title', 'Status', 'Priority'];
        $position = 1;

        foreach ($columns as $column) {
            $isEssential = in_array($column->name, $essentialColumns);

            $preferences[$column->id] = [
                'visible' => $isEssential,
                'width' => $column->width,
                'position' => $isEssential ? $position++ : null,
            ];
        }

        return $preferences;
    }

    /**
     * Generate preferences for detailed view.
     */
    protected function generateDetailedViewPreferences($boardId): array
    {
        $board = Board::find($boardId);
        $preferences = [];
        $columns = $board->columns ?? [];

        foreach ($columns as $index => $column) {
            $preferences[$column->id] = [
                'visible' => true, // Show all columns
                'width' => $this->faker->randomFloat(4, 150, 400),
                'position' => $index + 1,
            ];
        }

        return $preferences;
    }

    /**
     * Create preferences for a new user with default settings.
     */
    public static function createDefaults(User $user, Board $board): UserBoardPreference
    {
        $preferences = [];
        $columns = $board->columns ?? [];

        foreach ($columns as $index => $column) {
            $preferences[$column->id] = [
                'visible' => true,
                'width' => $column->width,
                'position' => $index + 1,
            ];
        }

        return static::factory()->create([
            'user_id' => $user->id,
            'board_id' => $board->id,
            'column_preferences' => $preferences,
        ]);
    }

    /**
     * Create preferences for multiple users on the same board.
     */
    public static function createForMultipleUsers(Board $board, array $users): array
    {
        $preferencesCollection = [];

        foreach ($users as $user) {
            $preferencesCollection[] = static::factory()
                ->forUser($user)
                ->forBoard($board)
                ->withCustomWidths()
                ->someHidden(0.2) // 20% of columns hidden on average
                ->create();
        }

        return $preferencesCollection;
    }

    /**
     * Create preferences for a single user across multiple boards.
     */
    public static function createForMultipleBoards(User $user, array $boards): array
    {
        $preferencesCollection = [];

        foreach ($boards as $board) {
            $viewType = $this->faker->randomElement(['minimal', 'default', 'detailed']);

            $factory = static::factory()
                ->forUser($user)
                ->forBoard($board);

            switch ($viewType) {
                case 'minimal':
                    $factory = $factory->minimalView();
                    break;
                case 'detailed':
                    $factory = $factory->detailedView();
                    break;
                default:
                    $factory = $factory->withCustomOrder();
            }

            $preferencesCollection[] = $factory->create();
        }

        return $preferencesCollection;
    }
}