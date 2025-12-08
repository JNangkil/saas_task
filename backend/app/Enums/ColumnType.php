<?php

namespace App\Enums;

use Illuminate\Support\Collection;

enum ColumnType: string
{
    case TEXT = 'text';
    case LONG_TEXT = 'long_text';
    case NUMBER = 'number';
    case DATE = 'date';
    case DATETIME = 'datetime';
    case STATUS = 'status';
    case PRIORITY = 'priority';
    case ASSIGNEE = 'assignee';
    case LABELS = 'labels';
    case CHECKBOX = 'checkbox';
    case URL = 'url';
    case EMAIL = 'email';
    case PHONE = 'phone';
    case CURRENCY = 'currency';
    case PERCENTAGE = 'percentage';

    /**
     * Get the human-readable label for the column type
     */
    public function getLabel(): string
    {
        return match($this) {
            self::TEXT => 'Text',
            self::LONG_TEXT => 'Long Text',
            self::NUMBER => 'Number',
            self::DATE => 'Date',
            self::DATETIME => 'Date & Time',
            self::STATUS => 'Status',
            self::PRIORITY => 'Priority',
            self::ASSIGNEE => 'Assignee',
            self::LABELS => 'Labels',
            self::CHECKBOX => 'Checkbox',
            self::URL => 'URL',
            self::EMAIL => 'Email',
            self::PHONE => 'Phone',
            self::CURRENCY => 'Currency',
            self::PERCENTAGE => 'Percentage',
        };
    }

    /**
     * Get the icon for the column type
     */
    public function getIcon(): string
    {
        return match($this) {
            self::TEXT => 'fas fa-font',
            self::LONG_TEXT => 'fas fa-align-left',
            self::NUMBER => 'fas fa-hashtag',
            self::DATE => 'fas fa-calendar',
            self::DATETIME => 'fas fa-calendar-alt',
            self::STATUS => 'fas fa-flag',
            self::PRIORITY => 'fas fa-exclamation-circle',
            self::ASSIGNEE => 'fas fa-user',
            self::LABELS => 'fas fa-tags',
            self::CHECKBOX => 'fas fa-check-square',
            self::URL => 'fas fa-link',
            self::EMAIL => 'fas fa-envelope',
            self::PHONE => 'fas fa-phone',
            self::CURRENCY => 'fas fa-dollar-sign',
            self::PERCENTAGE => 'fas fa-percent',
        };
    }

    /**
     * Get default options for the column type
     */
    public function getDefaultOptions(): array
    {
        return match($this) {
            self::TEXT => [
                'placeholder' => '',
                'max_length' => 255,
                'required' => false,
            ],
            self::LONG_TEXT => [
                'placeholder' => '',
                'max_length' => 5000,
                'required' => false,
                'rows' => 3,
            ],
            self::NUMBER => [
                'placeholder' => '',
                'required' => false,
                'min' => null,
                'max' => null,
                'decimal_places' => 0,
            ],
            self::DATE => [
                'required' => false,
                'default_to_today' => false,
            ],
            self::DATETIME => [
                'required' => false,
                'default_to_now' => false,
            ],
            self::STATUS => [
                'required' => false,
                'options' => [
                    ['value' => 'todo', 'label' => 'To Do', 'color' => '#6B7280'],
                    ['value' => 'in_progress', 'label' => 'In Progress', 'color' => '#3B82F6'],
                    ['value' => 'done', 'label' => 'Done', 'color' => '#10B981'],
                ],
            ],
            self::PRIORITY => [
                'required' => false,
                'options' => [
                    ['value' => 'low', 'label' => 'Low', 'color' => '#6B7280'],
                    ['value' => 'medium', 'label' => 'Medium', 'color' => '#F59E0B'],
                    ['value' => 'high', 'label' => 'High', 'color' => '#EF4444'],
                    ['value' => 'urgent', 'label' => 'Urgent', 'color' => '#DC2626'],
                ],
            ],
            self::ASSIGNEE => [
                'required' => false,
                'multiple' => false,
            ],
            self::LABELS => [
                'required' => false,
                'multiple' => true,
                'max_labels' => 10,
            ],
            self::CHECKBOX => [
                'required' => false,
                'default_value' => false,
            ],
            self::URL => [
                'placeholder' => 'https://example.com',
                'required' => false,
            ],
            self::EMAIL => [
                'placeholder' => 'email@example.com',
                'required' => false,
            ],
            self::PHONE => [
                'placeholder' => '+1 (555) 123-4567',
                'required' => false,
            ],
            self::CURRENCY => [
                'placeholder' => '0.00',
                'required' => false,
                'currency_code' => 'USD',
                'symbol' => '$',
                'decimal_places' => 2,
            ],
            self::PERCENTAGE => [
                'placeholder' => '0%',
                'required' => false,
                'min' => 0,
                'max' => 100,
                'decimal_places' => 0,
            ],
        };
    }

    /**
     * Get validation rules for the column type
     */
    public function getValidationRules(): array
    {
        return match($this) {
            self::TEXT => ['string', 'max:255'],
            self::LONG_TEXT => ['string', 'max:5000'],
            self::NUMBER => ['numeric'],
            self::DATE => ['date'],
            self::DATETIME => ['date'],
            self::STATUS => ['string', 'in:todo,in_progress,done'],
            self::PRIORITY => ['string', 'in:low,medium,high,urgent'],
            self::ASSIGNEE => ['exists:users,id'],
            self::LABELS => ['array'],
            self::CHECKBOX => ['boolean'],
            self::URL => ['url'],
            self::EMAIL => ['email'],
            self::PHONE => ['string', 'regex:/^[+]?[\d\s\-\(\)]+$/'],
            self::CURRENCY => ['numeric', 'min:0'],
            self::PERCENTAGE => ['numeric', 'between:0,100'],
        };
    }

    /**
     * Get filter operators available for this column type
     */
    public function getFilterOperators(): array
    {
        return match($this) {
            self::TEXT, self::LONG_TEXT, self::URL, self::EMAIL, self::PHONE => [
                'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'
            ],
            self::NUMBER, self::CURRENCY, self::PERCENTAGE => [
                'equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'is_empty', 'is_not_empty'
            ],
            self::DATE, self::DATETIME => [
                'equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'is_empty', 'is_not_empty'
            ],
            self::STATUS, self::PRIORITY => [
                'equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'
            ],
            self::ASSIGNEE => [
                'equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'
            ],
            self::LABELS => [
                'contains', 'not_contains', 'is_empty', 'is_not_empty'
            ],
            self::CHECKBOX => [
                'equals', 'not_equals'
            ],
        };
    }

    /**
     * Get frontend component for this column type
     */
    public function getFrontendComponent(): string
    {
        return match($this) {
            self::TEXT => 'TextInput',
            self::LONG_TEXT => 'TextareaInput',
            self::NUMBER => 'NumberInput',
            self::DATE => 'DateInput',
            self::DATETIME => 'DateTimeInput',
            self::STATUS => 'StatusSelect',
            self::PRIORITY => 'PrioritySelect',
            self::ASSIGNEE => 'UserSelect',
            self::LABELS => 'LabelSelect',
            self::CHECKBOX => 'CheckboxInput',
            self::URL => 'UrlInput',
            self::EMAIL => 'EmailInput',
            self::PHONE => 'PhoneInput',
            self::CURRENCY => 'CurrencyInput',
            self::PERCENTAGE => 'PercentageInput',
        };
    }

    /**
     * Get database casting information
     */
    public function getDatabaseCast(): string
    {
        return match($this) {
            self::TEXT, self::LONG_TEXT, self::URL, self::EMAIL, self::PHONE => 'string',
            self::NUMBER, self::CURRENCY, self::PERCENTAGE => 'decimal',
            self::DATE, self::DATETIME => 'datetime',
            self::STATUS, self::PRIORITY => 'string',
            self::ASSIGNEE => 'integer',
            self::LABELS => 'json',
            self::CHECKBOX => 'boolean',
        };
    }

    /**
     * Format value for display
     */
    public function formatValue(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        return match($this) {
            self::TEXT, self::LONG_TEXT, self::URL, self::EMAIL, self::PHONE, self::STATUS, self::PRIORITY => (string) $value,
            self::NUMBER => number_format((float) $value),
            self::DATE => $value instanceof \Carbon\Carbon ? $value->format('M d, Y') : date('M d, Y', strtotime($value)),
            self::DATETIME => $value instanceof \Carbon\Carbon ? $value->format('M d, Y H:i') : date('M d, Y H:i', strtotime($value)),
            self::ASSIGNEE => $value instanceof \App\Models\User ? $value->name : (string) $value,
            self::LABELS => is_array($value) ? implode(', ', $value) : (string) $value,
            self::CHECKBOX => $value ? 'Yes' : 'No',
            self::CURRENCY => '$' . number_format((float) $value, 2),
            self::PERCENTAGE => number_format((float) $value) . '%',
        };
    }

    /**
     * Get all column types as a collection
     */
    public static function all(): Collection
    {
        return collect(self::cases());
    }

    /**
     * Get column types that can be used for filtering
     */
    public static function filterable(): Collection
    {
        return collect(self::cases());
    }

    /**
     * Get column types that can be sorted
     */
    public static function sortable(): Collection
    {
        return collect(self::cases())->filter(fn($type) => 
            !in_array($type, [self::LABELS, self::CHECKBOX])
        );
    }

    /**
     * Check if this column type supports multiple values
     */
    public function supportsMultipleValues(): bool
    {
        return match($this) {
            self::LABELS, self::ASSIGNEE => true,
            default => false,
        };
    }

    /**
     * Get the JSON schema for this column type
     */
    public function getJsonSchema(): array
    {
        $schema = [
            'type' => match($this) {
                self::TEXT, self::LONG_TEXT, self::URL, self::EMAIL, self::PHONE, self::STATUS, self::PRIORITY => 'string',
                self::NUMBER, self::CURRENCY, self::PERCENTAGE => 'number',
                self::DATE, self::DATETIME => 'string',
                self::ASSIGNEE => 'integer',
                self::LABELS => 'array',
                self::CHECKBOX => 'boolean',
            },
            'format' => match($this) {
                self::DATE => 'date',
                self::DATETIME => 'date-time',
                self::EMAIL => 'email',
                self::URL => 'uri',
                default => null,
            },
        ];

        if ($this === self::LABELS) {
            $schema['items'] = ['type' => 'string'];
        }

        return array_filter($schema);
    }
}