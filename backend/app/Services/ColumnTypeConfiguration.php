<?php

namespace App\Services;

use App\Enums\ColumnType;
use Illuminate\Support\Collection;

class ColumnTypeConfiguration
{
    /**
     * Get all available column types with their configurations
     */
    public static function getAllTypes(): Collection
    {
        return collect(ColumnType::cases())->map(function ($type) {
            return [
                'value' => $type->value,
                'label' => $type->getLabel(),
                'icon' => $type->getIcon(),
                'component' => $type->getFrontendComponent(),
                'default_options' => $type->getDefaultOptions(),
                'validation_rules' => $type->getValidationRules(),
                'filter_operators' => $type->getFilterOperators(),
                'supports_multiple' => $type->supportsMultipleValues(),
                'database_cast' => $type->getDatabaseCast(),
                'json_schema' => $type->getJsonSchema(),
            ];
        });
    }

    /**
     * Get configuration for a specific column type
     */
    public static function getTypeConfiguration(string $type): array
    {
        $columnType = ColumnType::from($type);
        
        return [
            'value' => $columnType->value,
            'label' => $columnType->getLabel(),
            'icon' => $columnType->getIcon(),
            'component' => $columnType->getFrontendComponent(),
            'default_options' => $columnType->getDefaultOptions(),
            'validation_rules' => $columnType->getValidationRules(),
            'filter_operators' => $columnType->getFilterOperators(),
            'supports_multiple' => $columnType->supportsMultipleValues(),
            'database_cast' => $columnType->getDatabaseCast(),
            'json_schema' => $columnType->getJsonSchema(),
        ];
    }

    /**
     * Get default columns for new boards
     */
    public static function getDefaultBoardColumns(): array
    {
        return [
            [
                'name' => 'Title',
                'type' => ColumnType::TEXT->value,
                'options' => [
                    'required' => true,
                    'placeholder' => 'Enter task title...',
                    'max_length' => 255,
                ],
                'order' => 1,
                'pinned' => true,
                'width' => 250,
            ],
            [
                'name' => 'Status',
                'type' => ColumnType::STATUS->value,
                'options' => [
                    'required' => false,
                    'options' => [
                        ['value' => 'todo', 'label' => 'To Do', 'color' => '#6B7280'],
                        ['value' => 'in_progress', 'label' => 'In Progress', 'color' => '#3B82F6'],
                        ['value' => 'review', 'label' => 'Review', 'color' => '#F59E0B'],
                        ['value' => 'done', 'label' => 'Done', 'color' => '#10B981'],
                    ],
                ],
                'order' => 2,
                'pinned' => true,
                'width' => 150,
            ],
            [
                'name' => 'Priority',
                'type' => ColumnType::PRIORITY->value,
                'options' => [
                    'required' => false,
                    'options' => [
                        ['value' => 'low', 'label' => 'Low', 'color' => '#6B7280'],
                        ['value' => 'medium', 'label' => 'Medium', 'color' => '#F59E0B'],
                        ['value' => 'high', 'label' => 'High', 'color' => '#EF4444'],
                        ['value' => 'urgent', 'label' => 'Urgent', 'color' => '#DC2626'],
                    ],
                ],
                'order' => 3,
                'pinned' => true,
                'width' => 120,
            ],
            [
                'name' => 'Assignee',
                'type' => ColumnType::ASSIGNEE->value,
                'options' => [
                    'required' => false,
                    'multiple' => false,
                ],
                'order' => 4,
                'pinned' => true,
                'width' => 150,
            ],
            [
                'name' => 'Due Date',
                'type' => ColumnType::DATE->value,
                'options' => [
                    'required' => false,
                    'default_to_today' => false,
                ],
                'order' => 5,
                'pinned' => true,
                'width' => 120,
            ],
        ];
    }

    /**
     * Get filter operator labels
     */
    public static function getFilterOperatorLabels(): array
    {
        return [
            'equals' => 'Equals',
            'not_equals' => 'Does not equal',
            'greater_than' => 'Greater than',
            'less_than' => 'Less than',
            'greater_equal' => 'Greater than or equal',
            'less_equal' => 'Less than or equal',
            'contains' => 'Contains',
            'not_contains' => 'Does not contain',
            'starts_with' => 'Starts with',
            'ends_with' => 'Ends with',
            'in' => 'Is one of',
            'not_in' => 'Is not one of',
            'is_empty' => 'Is empty',
            'is_not_empty' => 'Is not empty',
        ];
    }

    /**
     * Get filter operator types for form validation
     */
    public static function getFilterOperatorTypes(): array
    {
        return [
            'equals' => ['text', 'number', 'date', 'select', 'user', 'checkbox'],
            'not_equals' => ['text', 'number', 'date', 'select', 'user', 'checkbox'],
            'greater_than' => ['number', 'date'],
            'less_than' => ['number', 'date'],
            'greater_equal' => ['number', 'date'],
            'less_equal' => ['number', 'date'],
            'contains' => ['text', 'labels'],
            'not_contains' => ['text', 'labels'],
            'starts_with' => ['text'],
            'ends_with' => ['text'],
            'in' => ['select', 'user'],
            'not_in' => ['select', 'user'],
            'is_empty' => ['text', 'number', 'date', 'select', 'user', 'labels'],
            'is_not_empty' => ['text', 'number', 'date', 'select', 'user', 'labels'],
        ];
    }

    /**
     * Get column width presets
     */
    public static function getColumnWidthPresets(): array
    {
        return [
            'auto' => ['label' => 'Auto', 'value' => 'auto'],
            'small' => ['label' => 'Small (100px)', 'value' => 100],
            'medium' => ['label' => 'Medium (150px)', 'value' => 150],
            'large' => ['label' => 'Large (200px)', 'value' => 200],
            'xlarge' => ['label' => 'Extra Large (250px)', 'value' => 250],
            'xxlarge' => ['label' => 'XX Large (300px)', 'value' => 300],
        ];
    }

    /**
     * Get default width for column type
     */
    public static function getDefaultWidth(string $type): int
    {
        return match($type) {
            ColumnType::TEXT->value => 200,
            ColumnType::LONG_TEXT->value => 250,
            ColumnType::NUMBER->value => 120,
            ColumnType::DATE->value => 120,
            ColumnType::DATETIME->value => 150,
            ColumnType::STATUS->value => 120,
            ColumnType::PRIORITY->value => 120,
            ColumnType::ASSIGNEE->value => 150,
            ColumnType::LABELS->value => 180,
            ColumnType::CHECKBOX->value => 80,
            ColumnType::URL->value => 200,
            ColumnType::EMAIL->value => 180,
            ColumnType::PHONE->value => 140,
            ColumnType::CURRENCY->value => 120,
            ColumnType::PERCENTAGE->value => 100,
            default => 150,
        };
    }

    /**
     * Get column type categories
     */
    public static function getTypeCategories(): array
    {
        return [
            'basic' => [
                'label' => 'Basic',
                'types' => [
                    ColumnType::TEXT->value,
                    ColumnType::LONG_TEXT->value,
                    ColumnType::NUMBER->value,
                ],
            ],
            'date_time' => [
                'label' => 'Date & Time',
                'types' => [
                    ColumnType::DATE->value,
                    ColumnType::DATETIME->value,
                ],
            ],
            'selection' => [
                'label' => 'Selection',
                'types' => [
                    ColumnType::STATUS->value,
                    ColumnType::PRIORITY->value,
                    ColumnType::ASSIGNEE->value,
                    ColumnType::LABELS->value,
                    ColumnType::CHECKBOX->value,
                ],
            ],
            'specialized' => [
                'label' => 'Specialized',
                'types' => [
                    ColumnType::URL->value,
                    ColumnType::EMAIL->value,
                    ColumnType::PHONE->value,
                    ColumnType::CURRENCY->value,
                    ColumnType::PERCENTAGE->value,
                ],
            ],
        ];
    }

    /**
     * Get column types by category
     */
    public static function getTypesByCategory(): array
    {
        $categories = self::getTypeCategories();
        $allTypes = self::getAllTypes()->keyBy('value');

        foreach ($categories as $category => &$config) {
            $config['types'] = collect($config['types'])->map(function ($type) use ($allTypes) {
                return $allTypes->get($type);
            })->filter()->values();
        }

        return $categories;
    }

    /**
     * Get export configuration for column types
     */
    public static function getExportConfiguration(): array
    {
        return [
            ColumnType::TEXT->value => [
                'formatter' => 'text',
                'alignment' => 'left',
            ],
            ColumnType::LONG_TEXT->value => [
                'formatter' => 'text',
                'alignment' => 'left',
                'wrap_text' => true,
            ],
            ColumnType::NUMBER->value => [
                'formatter' => 'number',
                'alignment' => 'right',
            ],
            ColumnType::DATE->value => [
                'formatter' => 'date',
                'format' => 'Y-m-d',
                'alignment' => 'center',
            ],
            ColumnType::DATETIME->value => [
                'formatter' => 'datetime',
                'format' => 'Y-m-d H:i:s',
                'alignment' => 'center',
            ],
            ColumnType::STATUS->value => [
                'formatter' => 'status',
                'alignment' => 'center',
            ],
            ColumnType::PRIORITY->value => [
                'formatter' => 'priority',
                'alignment' => 'center',
            ],
            ColumnType::ASSIGNEE->value => [
                'formatter' => 'user',
                'alignment' => 'left',
            ],
            ColumnType::LABELS->value => [
                'formatter' => 'labels',
                'alignment' => 'left',
            ],
            ColumnType::CHECKBOX->value => [
                'formatter' => 'boolean',
                'alignment' => 'center',
            ],
            ColumnType::URL->value => [
                'formatter' => 'url',
                'alignment' => 'left',
            ],
            ColumnType::EMAIL->value => [
                'formatter' => 'email',
                'alignment' => 'left',
            ],
            ColumnType::PHONE->value => [
                'formatter' => 'phone',
                'alignment' => 'left',
            ],
            ColumnType::CURRENCY->value => [
                'formatter' => 'currency',
                'alignment' => 'right',
            ],
            ColumnType::PERCENTAGE->value => [
                'formatter' => 'percentage',
                'alignment' => 'right',
            ],
        ];
    }

    /**
     * Get search configuration for column types
     */
    public static function getSearchConfiguration(): array
    {
        return [
            ColumnType::TEXT->value => [
                'searchable' => true,
                'weight' => 1.0,
                'analyzer' => 'standard',
            ],
            ColumnType::LONG_TEXT->value => [
                'searchable' => true,
                'weight' => 0.8,
                'analyzer' => 'standard',
            ],
            ColumnType::NUMBER->value => [
                'searchable' => false,
                'filterable' => true,
            ],
            ColumnType::DATE->value => [
                'searchable' => false,
                'filterable' => true,
                'rangeable' => true,
            ],
            ColumnType::DATETIME->value => [
                'searchable' => false,
                'filterable' => true,
                'rangeable' => true,
            ],
            ColumnType::STATUS->value => [
                'searchable' => false,
                'filterable' => true,
            ],
            ColumnType::PRIORITY->value => [
                'searchable' => false,
                'filterable' => true,
            ],
            ColumnType::ASSIGNEE->value => [
                'searchable' => true,
                'weight' => 0.5,
                'filterable' => true,
            ],
            ColumnType::LABELS->value => [
                'searchable' => true,
                'weight' => 0.6,
                'filterable' => true,
            ],
            ColumnType::CHECKBOX->value => [
                'searchable' => false,
                'filterable' => true,
            ],
            ColumnType::URL->value => [
                'searchable' => false,
                'filterable' => false,
            ],
            ColumnType::EMAIL->value => [
                'searchable' => true,
                'weight' => 0.4,
            ],
            ColumnType::PHONE->value => [
                'searchable' => true,
                'weight' => 0.3,
            ],
            ColumnType::CURRENCY->value => [
                'searchable' => false,
                'filterable' => true,
                'rangeable' => true,
            ],
            ColumnType::PERCENTAGE->value => [
                'searchable' => false,
                'filterable' => true,
                'rangeable' => true,
            ],
        ];
    }

    /**
     * Get validation configuration for API documentation
     */
    public static function getApiDocumentation(): array
    {
        return collect(ColumnType::cases())->mapWithKeys(function ($type) {
            return [
                $type->value => [
                    'type' => $type->getJsonSchema()['type'] ?? 'string',
                    'format' => $type->getJsonSchema()['format'] ?? null,
                    'description' => "Field of type: {$type->getLabel()}",
                    'example' => self::getExampleValue($type),
                    'validation' => $type->getValidationRules(),
                ]
            ];
        })->toArray();
    }

    /**
     * Get example value for documentation
     */
    private static function getExampleValue(ColumnType $type): mixed
    {
        return match($type) {
            ColumnType::TEXT => 'Example text',
            ColumnType::LONG_TEXT => 'This is a longer example text that can span multiple lines.',
            ColumnType::NUMBER => 42,
            ColumnType::DATE => '2024-01-15',
            ColumnType::DATETIME => '2024-01-15T14:30:00Z',
            ColumnType::STATUS => 'in_progress',
            ColumnType::PRIORITY => 'high',
            ColumnType::ASSIGNEE => 1,
            ColumnType::LABELS => ['bug', 'urgent'],
            ColumnType::CHECKBOX => true,
            ColumnType::URL => 'https://example.com',
            ColumnType::EMAIL => 'user@example.com',
            ColumnType::PHONE => '+1 (555) 123-4567',
            ColumnType::CURRENCY => 99.99,
            ColumnType::PERCENTAGE => 75,
        };
    }
}