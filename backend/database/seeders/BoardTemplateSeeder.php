<?php

namespace Database\Seeders;

use App\Models\BoardTemplate;
use Illuminate\Database\Seeder;

class BoardTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Simple To-Do',
                'description' => 'A basic board with To Do, In Progress, and Done columns.',
                'icon' => 'check_circle',
                'config' => [
                    'columns' => [
                        ['name' => 'To Do', 'color' => '#64748b', 'limit' => 0],
                        ['name' => 'In Progress', 'color' => '#3b82f6', 'limit' => 0],
                        ['name' => 'Done', 'color' => '#22c55e', 'limit' => 0],
                    ],
                ],
            ],
            [
                'name' => 'Marketing Sprint',
                'description' => 'Track marketing content from ideation to publication.',
                'icon' => 'campaign',
                'config' => [
                    'columns' => [
                        ['name' => 'Backlog', 'color' => '#94a3b8', 'limit' => 0],
                        ['name' => 'Planning', 'color' => '#f59e0b', 'limit' => 0],
                        ['name' => 'In Progress', 'color' => '#3b82f6', 'limit' => 5],
                        ['name' => 'Review', 'color' => '#8b5cf6', 'limit' => 0],
                        ['name' => 'Done', 'color' => '#22c55e', 'limit' => 0],
                    ],
                ],
            ],
            [
                'name' => 'Bug Tracker',
                'description' => 'Manage software bugs and issues.',
                'icon' => 'bug_report',
                'config' => [
                    'columns' => [
                        ['name' => 'New', 'color' => '#ef4444', 'limit' => 0],
                        ['name' => 'Triaged', 'color' => '#f97316', 'limit' => 0],
                        ['name' => 'In Progress', 'color' => '#3b82f6', 'limit' => 0],
                        ['name' => 'Testing', 'color' => '#a855f7', 'limit' => 0],
                        ['name' => 'Closed', 'color' => '#22c55e', 'limit' => 0],
                    ],
                ],
            ],
            [
                'name' => 'Personal Tasks',
                'description' => 'Minimal board for personal productivity.',
                'icon' => 'person',
                'config' => [
                    'columns' => [
                        ['name' => 'To Do', 'color' => '#64748b', 'limit' => 0],
                        ['name' => 'Done', 'color' => '#22c55e', 'limit' => 0],
                    ],
                ],
            ],
        ];

        foreach ($templates as $template) {
            BoardTemplate::updateOrCreate(
                ['name' => $template['name'], 'is_global' => true],
                array_merge($template, [
                    'tenant_id' => null,
                    'is_published' => true,
                    'created_by' => null, // System created
                ])
            );
        }
    }
}
