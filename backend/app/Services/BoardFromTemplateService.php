<?php

namespace App\Services;

use App\Models\Board;
use App\Models\BoardTemplate;
use App\Models\Workspace;
use App\Models\BoardColumn;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class BoardFromTemplateService
{
    /**
     * Create a new board from a template.
     */
    public function createBoardFromTemplate(User $user, Workspace $workspace, BoardTemplate $template, array $overrides = []): Board
    {
        return DB::transaction(function () use ($user, $workspace, $template, $overrides) {
            // 1. Create Board
            $board = Board::create([
                'tenant_id' => $workspace->tenant_id,
                'workspace_id' => $workspace->id,
                'name' => $overrides['name'] ?? $template->name, // User provided name or template name
                'description' => $overrides['description'] ?? $template->description,
                'icon' => $overrides['icon'] ?? $template->icon,
                'color' => $overrides['color'] ?? '#3b82f6', // Default blue if not in template/overrides
                'type' => 'kanban', // Templates usually imply kanban structure
                'created_by' => $user->id,
                'position' => 0, 
            ]);

            // 2. Create Columns from Template Config
            $config = $template->config;
            $columns = $config['columns'] ?? [];

            foreach ($columns as $index => $colConfig) {
                BoardColumn::create([
                    'board_id' => $board->id,
                    'name' => $colConfig['name'],
                    'color' => $colConfig['color'] ?? '#e2e8f0',
                    'position' => $index, // 0-indexed based on array order
                    'limit' => $colConfig['limit'] ?? 0,
                    'is_default' => $index === 0, // First column is default/backlog?
                ]);
            }

            // 3. Optional: Sample Tasks (if defined in template)
            if (!empty($config['tasks']) && ($overrides['include_sample_data'] ?? false)) {
                // ... logic to create sample tasks ...
            }

            return $board;
        });
    }

    /**
     * Create a template from an existing board.
     */
    public function createTemplateFromBoard(User $user, Board $board, array $data): BoardTemplate
    {
        return DB::transaction(function () use ($user, $board, $data) {
            // Extract config from board
            $columns = $board->columns()->orderBy('position')->get()->map(function ($column) {
                return [
                    'name' => $column->name,
                    'color' => $column->color,
                    'limit' => $column->limit,
                ];
            })->toArray();

            $config = [
                'columns' => $columns,
                // 'tasks' => ... (if we wanted to template tasks too)
            ];

            return BoardTemplate::create([
                'tenant_id' => $board->tenant_id,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'icon' => $data['icon'] ?? $board->icon,
                'config' => $config,
                'is_global' => false,
                'is_published' => true,
                'created_by' => $user->id,
            ]);
        });
    }
}
