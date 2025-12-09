<?php

namespace Database\Seeders;

use App\Models\Board;
use App\Models\BoardColumn;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DefaultBoardColumnsSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all boards that don't have columns yet
        $boards = Board::whereDoesntHave('columns')->get();

        foreach ($boards as $board) {
            $this->createDefaultColumnsForBoard($board);
        }
    }

    /**
     * Create default columns for a specific board.
     */
    protected function createDefaultColumnsForBoard(Board $board): void
    {
        $columns = $this->getDefaultColumnsDefinition();

        // Use transaction to ensure all columns are created or none
        DB::transaction(function () use ($board, $columns) {
            $position = 1000; // Starting position

            foreach ($columns as $columnData) {
                BoardColumn::create([
                    'board_id' => $board->id,
                    'name' => $columnData['name'],
                    'type' => $columnData['type'],
                    'position' => $position,
                    'width' => $columnData['width'],
                    'is_pinned' => $columnData['is_pinned'] ?? false,
                    'is_required' => $columnData['is_required'] ?? false,
                    'options' => $columnData['options'] ?? null,
                ]);

                $position += 1000; // Increment position for next column
            }
        });
    }

    /**
     * Get the definition of default columns.
     */
    protected function getDefaultColumnsDefinition(): array
    {
        return [
            [
                'name' => 'Title',
                'type' => 'text',
                'width' => 300,
                'is_pinned' => true,
                'is_required' => true,
            ],
            [
                'name' => 'Status',
                'type' => 'select',
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
            ],
            [
                'name' => 'Priority',
                'type' => 'select',
                'width' => 120,
                'is_pinned' => true,
                'is_required' => true,
                'options' => [
                    'choices' => [
                        ['value' => 'low', 'label' => 'Low', 'color' => '#6B7280', 'priority' => 1],
                        ['value' => 'medium', 'label' => 'Medium', 'color' => '#F59E0B', 'priority' => 2],
                        ['value' => 'high', 'label' => 'High', 'color' => '#EF4444', 'priority' => 3],
                        ['value' => 'urgent', 'label' => 'Urgent', 'color' => '#DC2626', 'priority' => 4],
                    ],
                    'default' => 'medium',
                    'allow_custom' => false,
                ],
            ],
            [
                'name' => 'Assignee',
                'type' => 'user',
                'width' => 200,
                'is_pinned' => false,
                'is_required' => false,
                'options' => [
                    'allow_multiple' => false,
                    'include_unassigned' => true,
                    'filter_by_workspace' => true,
                ],
            ],
            [
                'name' => 'Due Date',
                'type' => 'date',
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
            ],
            [
                'name' => 'Labels',
                'type' => 'multiselect',
                'width' => 200,
                'is_pinned' => false,
                'is_required' => false,
                'options' => [
                    'choices' => [
                        ['value' => 'bug', 'label' => 'Bug', 'color' => '#EF4444'],
                        ['value' => 'feature', 'label' => 'Feature', 'color' => '#3B82F6'],
                        ['value' => 'enhancement', 'label' => 'Enhancement', 'color' => '#10B981'],
                        ['value' => 'documentation', 'label' => 'Documentation', 'color' => '#8B5CF6'],
                        ['value' => 'urgent', 'label' => 'Urgent', 'color' => '#F59E0B'],
                        ['value' => 'help-wanted', 'label' => 'Help Wanted', 'color' => '#6B7280'],
                    ],
                    'allow_custom' => true,
                    'max_selections' => 5,
                ],
            ],
            [
                'name' => 'Description',
                'type' => 'textarea',
                'width' => 250,
                'is_pinned' => false,
                'is_required' => false,
                'options' => [
                    'placeholder' => 'Add a description...',
                    'max_length' => 2000,
                    'allow_html' => false,
                    'rows' => 3,
                ],
            ],
            [
                'name' => 'Progress',
                'type' => 'number',
                'width' => 120,
                'is_pinned' => false,
                'is_required' => false,
                'options' => [
                    'min' => 0,
                    'max' => 100,
                    'default' => 0,
                    'suffix' => '%',
                    'step' => 10,
                ],
            ],
            [
                'name' => 'Estimated Hours',
                'type' => 'number',
                'width' => 120,
                'is_pinned' => false,
                'is_required' => false,
                'options' => [
                    'min' => 0.1,
                    'max' => 999.9,
                    'default' => null,
                    'suffix' => 'h',
                    'step' => 0.5,
                    'decimal_places' => 1,
                ],
            ],
            [
                'name' => 'Actual Hours',
                'type' => 'number',
                'width' => 120,
                'is_pinned' => false,
                'is_required' => false,
                'options' => [
                    'min' => 0,
                    'max' => 999.9,
                    'default' => null,
                    'suffix' => 'h',
                    'step' => 0.5,
                    'decimal_places' => 1,
                ],
            ],
            [
                'name' => 'Created Date',
                'type' => 'datetime',
                'width' => 140,
                'is_pinned' => false,
                'is_required' => false,
                'options' => [
                    'read_only' => true,
                    'include_time' => true,
                    'format' => 'YYYY-MM-DD HH:mm',
                ],
            ],
            [
                'name' => 'Completed Date',
                'type' => 'datetime',
                'width' => 140,
                'is_pinned' => false,
                'is_required' => false,
                'options' => [
                    'read_only' => true,
                    'include_time' => true,
                    'format' => 'YYYY-MM-DD HH:mm',
                    'auto_set_on_status' => ['done'],
                ],
            ],
        ];
    }

    /**
     * Create default columns for a specific board ID.
     * Useful for testing or when you have a specific board ID.
     */
    public function createForBoard(int $boardId): void
    {
        $board = Board::find($boardId);

        if (!$board) {
            throw new \InvalidArgumentException("Board with ID {$boardId} not found");
        }

        // Delete existing columns for this board
        BoardColumn::where('board_id', $boardId)->delete();

        $this->createDefaultColumnsForBoard($board);
    }
}