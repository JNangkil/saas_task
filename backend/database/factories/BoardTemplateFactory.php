<?php

namespace Database\Factories;

use App\Models\BoardTemplate;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BoardTemplateFactory extends Factory
{
    protected $model = BoardTemplate::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'icon' => 'template',
            'config' => [
                'columns' => [
                    ['name' => 'To Do', 'color' => '#e2e8f0'],
                    ['name' => 'In Progress', 'color' => '#3b82f6'],
                    ['name' => 'Done', 'color' => '#22c55e'],
                ]
            ],
            'is_global' => false,
            'is_published' => true,
            'created_by' => User::factory(),
        ];
    }

    public function global(): Factory
    {
        return $this->state(function (array $attributes) {
            return [
                'tenant_id' => null,
                'is_global' => true,
            ];
        });
    }
}
