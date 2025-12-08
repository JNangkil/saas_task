<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Enums\ColumnType;

class TaskFieldValueResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param Request $request
     * @return array
     */
    public function toArray(Request $request): array
    {
        $columnType = $this->boardColumn ? ColumnType::tryFrom($this->boardColumn->type) : null;
        
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'board_column_id' => $this->board_column_id,
            'value' => $this->value,
            
            // Formatted values for display
            'typed_value' => $this->getTypedValue(),
            'display_value' => $this->getDisplayValue(),
            'formatted_value' => $this->getFormattedValue(),
            
            // Validation information
            'is_valid' => $this->validateValue(),
            'validation_error' => $this->getValidationErrorMessage(),
            
            // Column information
            'column' => $this->when($this->boardColumn, function () {
                return [
                    'id' => $this->boardColumn->id,
                    'name' => $this->boardColumn->name,
                    'type' => $this->boardColumn->type,
                    'type_label' => $columnType?->getLabel(),
                    'type_icon' => $columnType?->getIcon(),
                    'options' => $this->boardColumn->options,
                    'is_required' => $this->boardColumn->is_required,
                    'frontend_component' => $columnType?->getFrontendComponent(),
                    'supports_multiple_values' => $columnType?->supportsMultipleValues(),
                ];
            }),
            
            // Metadata
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /**
     * Get the typed value based on the column type.
     */
    protected function getTypedValue(): mixed
    {
        if (!$this->boardColumn) {
            return $this->value;
        }

        return match ($this->boardColumn->type) {
            'text', 'textarea', 'email', 'url', 'select' => is_array($this->value) ? implode(', ', $this->value) : $this->value,
            'number' => is_numeric($this->value) ? (float) $this->value : 0,
            'date', 'datetime' => $this->value ? now()->parse($this->value) : null,
            'boolean', 'checkbox' => (bool) $this->value,
            'multiselect' => is_array($this->value) ? $this->value : [],
            'file' => $this->value,
            'currency' => is_numeric($this->value) ? (float) $this->value : 0,
            'percentage' => is_numeric($this->value) ? (float) $this->value : 0,
            default => $this->value,
        };
    }

    /**
     * Get the display value for the field.
     */
    protected function getDisplayValue(): string
    {
        $value = $this->getTypedValue();

        if (!$this->boardColumn) {
            return is_array($value) ? json_encode($value) : (string) $value;
        }

        return match ($this->boardColumn->type) {
            'boolean', 'checkbox' => $value ? 'Yes' : 'No',
            'date' => $value ? $value->format('Y-m-d') : '',
            'datetime' => $value ? $value->format('Y-m-d H:i:s') : '',
            'multiselect' => is_array($value) ? implode(', ', $value) : (string) $value,
            'file' => is_array($value) && isset($value['name']) ? $value['name'] : (string) $value,
            'currency' => $value ? '$' . number_format($value, 2) : '',
            'percentage' => $value ? number_format($value) . '%' : '',
            default => is_array($value) ? json_encode($value) : (string) $value,
        };
    }

    /**
     * Get the formatted value based on column type options.
     */
    protected function getFormattedValue(): mixed
    {
        if (!$this->boardColumn || !$this->value) {
            return $this->getDisplayValue();
        }

        $options = $this->boardColumn->options ?? [];
        $value = $this->getTypedValue();

        return match ($this->boardColumn->type) {
            'status', 'priority' => $this->formatSelectOption($value, $options['options'] ?? []),
            'labels' => $this->formatLabels($value, $options['options'] ?? []),
            'assignee' => $this->formatAssignee($value),
            'currency' => $this->formatCurrency($value, $options),
            'percentage' => $this->formatPercentage($value, $options),
            'date' => $this->formatDate($value, $options),
            'datetime' => $this->formatDateTime($value, $options),
            default => $this->getDisplayValue(),
        };
    }

    /**
     * Format select option (status/priority).
     */
    protected function formatSelectOption($value, array $options): mixed
    {
        foreach ($options as $option) {
            if (($option['value'] ?? null) === $value) {
                return [
                    'value' => $value,
                    'label' => $option['label'] ?? $value,
                    'color' => $option['color'] ?? '#6B7280',
                ];
            }
        }

        return $value;
    }

    /**
     * Format labels.
     */
    protected function formatLabels($value, array $options): array
    {
        if (!is_array($value)) {
            return [];
        }

        $formattedLabels = [];
        foreach ($value as $labelValue) {
            $label = [
                'value' => $labelValue,
                'label' => $labelValue,
                'color' => '#6B7280',
            ];

            foreach ($options as $option) {
                if (($option['value'] ?? null) === $labelValue) {
                    $label['label'] = $option['label'] ?? $labelValue;
                    $label['color'] = $option['color'] ?? '#6B7280';
                    break;
                }
            }

            $formattedLabels[] = $label;
        }

        return $formattedLabels;
    }

    /**
     * Format assignee.
     */
    protected function formatAssignee($value): mixed
    {
        if (!$value) {
            return null;
        }

        $user = \App\Models\User::find($value);
        if (!$user) {
            return $value;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar_url ?? null,
        ];
    }

    /**
     * Format currency.
     */
    protected function formatCurrency($value, array $options): string
    {
        if (!$value) {
            return '';
        }

        $currencyCode = $options['currency_code'] ?? 'USD';
        $symbol = $options['symbol'] ?? '$';
        $decimalPlaces = $options['decimal_places'] ?? 2;

        return $symbol . number_format($value, $decimalPlaces);
    }

    /**
     * Format percentage.
     */
    protected function formatPercentage($value, array $options): string
    {
        if (!$value && $value !== 0) {
            return '';
        }

        $decimalPlaces = $options['decimal_places'] ?? 0;
        return number_format($value, $decimalPlaces) . '%';
    }

    /**
     * Format date.
     */
    protected function formatDate($value, array $options): string
    {
        if (!$value) {
            return '';
        }

        $format = $options['format'] ?? 'Y-m-d';
        return $value->format($format);
    }

    /**
     * Format datetime.
     */
    protected function formatDateTime($value, array $options): string
    {
        if (!$value) {
            return '';
        }

        $format = $options['format'] ?? 'Y-m-d H:i:s';
        return $value->format($format);
    }

    /**
     * Validate the value against the column rules.
     */
    protected function validateValue(): bool
    {
        if (!$this->boardColumn) {
            return false;
        }

        $value = $this->getTypedValue();
        $rules = $this->boardColumn->getValidationRules();

        // Simple validation - in a real app, you'd use Laravel's validator
        if ($this->boardColumn->is_required && (is_null($value) || $value === '')) {
            return false;
        }

        return match ($this->boardColumn->type) {
            'email' => filter_var($value, FILTER_VALIDATE_EMAIL) !== false,
            'url' => filter_var($value, FILTER_VALIDATE_URL) !== false,
            'number' => is_numeric($value),
            'date' => !is_null($value) && strtotime($value) !== false,
            'datetime' => !is_null($value) && strtotime($value) !== false,
            'select' => in_array($value, $this->boardColumn->options ?? []),
            'multiselect' => !is_null($value) && is_array($value) && empty(array_diff($value, $this->boardColumn->options ?? [])),
            default => true,
        };
    }

    /**
     * Get the validation error message.
     */
    protected function getValidationErrorMessage(): string
    {
        if (!$this->boardColumn) {
            return 'Invalid column configuration';
        }

        $value = $this->getTypedValue();

        if ($this->boardColumn->is_required && (is_null($value) || $value === '')) {
            return "The {$this->boardColumn->name} field is required.";
        }

        return match ($this->boardColumn->type) {
            'email' => 'Please enter a valid email address.',
            'url' => 'Please enter a valid URL.',
            'number' => 'Please enter a valid number.',
            'date' => 'Please enter a valid date.',
            'datetime' => 'Please enter a valid date and time.',
            'select' => 'Please select a valid option.',
            'multiselect' => 'Please select valid options.',
            default => 'Invalid value',
        };
    }
}