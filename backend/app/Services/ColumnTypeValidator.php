<?php

namespace App\Services;

use App\Enums\ColumnType;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ColumnTypeValidator
{
    /**
     * Validate a column type
     */
    public static function validateColumnType(string $type): bool
    {
        return in_array($type, array_column(ColumnType::cases(), 'value'));
    }

    /**
     * Validate column options based on column type
     */
    public static function validateColumnOptions(string $type, array $options): array
    {
        $columnType = ColumnType::from($type);
        $defaultOptions = $columnType->getDefaultOptions();
        
        $validator = Validator::make($options, self::getColumnOptionRules($columnType), [
            'required' => 'The :field field is required.',
            'string' => 'The :field must be a string.',
            'boolean' => 'The :field must be a boolean.',
            'numeric' => 'The :field must be a number.',
            'integer' => 'The :field must be an integer.',
            'array' => 'The :field must be an array.',
            'min' => 'The :field must be at least :min.',
            'max' => 'The :field may not be greater than :max.',
            'between' => 'The :field must be between :min and :max.',
            'in' => 'The selected :field is invalid.',
            'regex' => 'The :field format is invalid.',
            'url' => 'The :field must be a valid URL.',
            'email' => 'The :field must be a valid email address.',
        ]);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return array_merge($defaultOptions, $options);
    }

    /**
     * Validate a field value based on column type and options
     */
    public static function validateFieldValue(string $type, mixed $value, array $options = []): mixed
    {
        $columnType = ColumnType::from($type);
        
        // Check if required
        if (isset($options['required']) && $options['required'] && ($value === null || $value === '')) {
            throw ValidationException::withMessages([
                'value' => ['This field is required.']
            ]);
        }

        // Allow empty values if not required
        if ($value === null || $value === '') {
            return null;
        }

        $rules = self::getFieldValueRules($columnType, $options);
        $messages = self::getFieldValidationMessages($columnType);

        $validator = Validator::make(['value' => $value], ['value' => $rules], $messages);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return self::formatValidatedValue($columnType, $value, $options);
    }

    /**
     * Get validation rules for column options
     */
    private static function getColumnOptionRules(ColumnType $type): array
    {
        return match($type) {
            ColumnType::TEXT => [
                'placeholder' => 'nullable|string|max:255',
                'max_length' => 'nullable|integer|min:1|max:1000',
                'required' => 'boolean',
            ],
            ColumnType::LONG_TEXT => [
                'placeholder' => 'nullable|string|max:255',
                'max_length' => 'nullable|integer|min:1|max:50000',
                'required' => 'boolean',
                'rows' => 'nullable|integer|min:1|max:20',
            ],
            ColumnType::NUMBER => [
                'placeholder' => 'nullable|string|max:255',
                'required' => 'boolean',
                'min' => 'nullable|numeric',
                'max' => 'nullable|numeric',
                'decimal_places' => 'nullable|integer|min:0|max:10',
            ],
            ColumnType::DATE => [
                'required' => 'boolean',
                'default_to_today' => 'boolean',
            ],
            ColumnType::DATETIME => [
                'required' => 'boolean',
                'default_to_now' => 'boolean',
            ],
            ColumnType::STATUS => [
                'required' => 'boolean',
                'options' => 'required|array|min:1',
                'options.*.value' => 'required|string|max:50',
                'options.*.label' => 'required|string|max:100',
                'options.*.color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            ],
            ColumnType::PRIORITY => [
                'required' => 'boolean',
                'options' => 'required|array|min:1',
                'options.*.value' => 'required|string|max:50',
                'options.*.label' => 'required|string|max:100',
                'options.*.color' => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            ],
            ColumnType::ASSIGNEE => [
                'required' => 'boolean',
                'multiple' => 'boolean',
            ],
            ColumnType::LABELS => [
                'required' => 'boolean',
                'multiple' => 'required|boolean',
                'max_labels' => 'nullable|integer|min:1|max:50',
            ],
            ColumnType::CHECKBOX => [
                'required' => 'boolean',
                'default_value' => 'boolean',
            ],
            ColumnType::URL => [
                'placeholder' => 'nullable|string|max:255',
                'required' => 'boolean',
            ],
            ColumnType::EMAIL => [
                'placeholder' => 'nullable|string|max:255',
                'required' => 'boolean',
            ],
            ColumnType::PHONE => [
                'placeholder' => 'nullable|string|max:255',
                'required' => 'boolean',
            ],
            ColumnType::CURRENCY => [
                'placeholder' => 'nullable|string|max:255',
                'required' => 'boolean',
                'currency_code' => 'nullable|string|max:3',
                'symbol' => 'nullable|string|max:10',
                'decimal_places' => 'nullable|integer|min:0|max:10',
            ],
            ColumnType::PERCENTAGE => [
                'placeholder' => 'nullable|string|max:255',
                'required' => 'boolean',
                'min' => 'nullable|integer|min:0',
                'max' => 'nullable|integer|min:0|max:100',
                'decimal_places' => 'nullable|integer|min:0|max:10',
            ],
        };
    }

    /**
     * Get validation rules for field values
     */
    private static function getFieldValueRules(ColumnType $type, array $options): array
    {
        $baseRules = $type->getValidationRules();
        
        return match($type) {
            ColumnType::TEXT => [
                ...$baseRules,
                'max:' . ($options['max_length'] ?? 255),
            ],
            ColumnType::LONG_TEXT => [
                ...$baseRules,
                'max:' . ($options['max_length'] ?? 5000),
            ],
            ColumnType::NUMBER => [
                ...$baseRules,
                isset($options['min']) ? 'min:' . $options['min'] : '',
                isset($options['max']) ? 'max:' . $options['max'] : '',
            ],
            ColumnType::STATUS => [
                'string',
                'in:' . implode(',', array_column($options['options'] ?? [], 'value')),
            ],
            ColumnType::PRIORITY => [
                'string',
                'in:' . implode(',', array_column($options['options'] ?? [], 'value')),
            ],
            ColumnType::LABELS => [
                'array',
                'max:' . ($options['max_labels'] ?? 10),
            ],
            ColumnType::PERCENTAGE => [
                ...$baseRules,
                'min:' . ($options['min'] ?? 0),
                'max:' . ($options['max'] ?? 100),
            ],
            default => $baseRules,
        };
    }

    /**
     * Get validation messages for field values
     */
    private static function getFieldValidationMessages(ColumnType $type): array
    {
        return match($type) {
            ColumnType::TEXT => [
                'value.string' => 'The text field must be a string.',
                'value.max' => 'The text may not be greater than :max characters.',
            ],
            ColumnType::LONG_TEXT => [
                'value.string' => 'The long text field must be a string.',
                'value.max' => 'The long text may not be greater than :max characters.',
            ],
            ColumnType::NUMBER => [
                'value.numeric' => 'The number field must be a numeric value.',
                'value.min' => 'The number must be at least :min.',
                'value.max' => 'The number may not be greater than :max.',
            ],
            ColumnType::DATE => [
                'value.date' => 'The date field must be a valid date.',
            ],
            ColumnType::DATETIME => [
                'value.date' => 'The datetime field must be a valid date and time.',
            ],
            ColumnType::STATUS => [
                'value.in' => 'The selected status is invalid.',
            ],
            ColumnType::PRIORITY => [
                'value.in' => 'The selected priority is invalid.',
            ],
            ColumnType::ASSIGNEE => [
                'value.exists' => 'The selected user does not exist.',
            ],
            ColumnType::LABELS => [
                'value.array' => 'The labels field must be an array.',
                'value.max' => 'You may select up to :max labels.',
            ],
            ColumnType::CHECKBOX => [
                'value.boolean' => 'The checkbox field must be true or false.',
            ],
            ColumnType::URL => [
                'value.url' => 'The URL field must be a valid URL.',
            ],
            ColumnType::EMAIL => [
                'value.email' => 'The email field must be a valid email address.',
            ],
            ColumnType::PHONE => [
                'value.regex' => 'The phone number format is invalid.',
            ],
            ColumnType::CURRENCY => [
                'value.numeric' => 'The currency field must be a numeric value.',
                'value.min' => 'The currency value must be at least :min.',
            ],
            ColumnType::PERCENTAGE => [
                'value.numeric' => 'The percentage field must be a numeric value.',
                'value.between' => 'The percentage must be between :min and :max.',
            ],
        };
    }

    /**
     * Format validated value for storage
     */
    private static function formatValidatedValue(ColumnType $type, mixed $value, array $options): mixed
    {
        return match($type) {
            ColumnType::TEXT, ColumnType::LONG_TEXT, ColumnType::URL, ColumnType::EMAIL, ColumnType::PHONE => trim($value),
            ColumnType::NUMBER, ColumnType::CURRENCY, ColumnType::PERCENTAGE => (float) $value,
            ColumnType::DATE => $value instanceof \Carbon\Carbon ? $value->format('Y-m-d') : date('Y-m-d', strtotime($value)),
            ColumnType::DATETIME => $value instanceof \Carbon\Carbon ? $value->format('Y-m-d H:i:s') : date('Y-m-d H:i:s', strtotime($value)),
            ColumnType::STATUS, ColumnType::PRIORITY => (string) $value,
            ColumnType::ASSIGNEE => (int) $value,
            ColumnType::LABELS => is_array($value) ? array_unique($value) : [(string) $value],
            ColumnType::CHECKBOX => (bool) $value,
            default => $value,
        };
    }

    /**
     * Validate filter value for a column type
     */
    public static function validateFilterValue(string $type, string $operator, mixed $value, array $options = []): mixed
    {
        $columnType = ColumnType::from($type);
        
        // Check if operator is valid for this type
        if (!in_array($operator, $columnType->getFilterOperators())) {
            throw ValidationException::withMessages([
                'operator' => ["The '{$operator}' operator is not valid for {$columnType->getLabel()} fields."]
            ]);
        }

        // Skip value validation for empty operators
        if (in_array($operator, ['is_empty', 'is_not_empty'])) {
            return null;
        }

        // Validate the value based on type and operator
        return match($columnType) {
            ColumnType::TEXT, ColumnType::LONG_TEXT, ColumnType::URL, ColumnType::EMAIL, ColumnType::PHONE => self::validateTextFilterValue($operator, $value),
            ColumnType::NUMBER, ColumnType::CURRENCY, ColumnType::PERCENTAGE => self::validateNumericFilterValue($operator, $value, $options),
            ColumnType::DATE, ColumnType::DATETIME => self::validateDateFilterValue($operator, $value),
            ColumnType::STATUS, ColumnType::PRIORITY => self::validateOptionFilterValue($operator, $value, $options),
            ColumnType::ASSIGNEE => self::validateUserFilterValue($operator, $value),
            ColumnType::LABELS => self::validateLabelsFilterValue($operator, $value, $options),
            ColumnType::CHECKBOX => self::validateCheckboxFilterValue($operator, $value),
        };
    }

    /**
     * Validate text filter values
     */
    private static function validateTextFilterValue(string $operator, mixed $value): string
    {
        if (!is_string($value)) {
            throw ValidationException::withMessages([
                'value' => ['The filter value must be a string.']
            ]);
        }

        if (in_array($operator, ['equals', 'not_equals']) && strlen($value) > 255) {
            throw ValidationException::withMessages([
                'value' => ['The filter value may not be greater than 255 characters.']
            ]);
        }

        return $value;
    }

    /**
     * Validate numeric filter values
     */
    private static function validateNumericFilterValue(string $operator, mixed $value, array $options): float
    {
        if (!is_numeric($value)) {
            throw ValidationException::withMessages([
                'value' => ['The filter value must be a number.']
            ]);
        }

        $value = (float) $value;

        if (isset($options['min']) && $value < $options['min']) {
            throw ValidationException::withMessages([
                'value' => ["The filter value must be at least {$options['min']}."]
            ]);
        }

        if (isset($options['max']) && $value > $options['max']) {
            throw ValidationException::withMessages([
                'value' => ["The filter value may not be greater than {$options['max']}."]
            ]);
        }

        return $value;
    }

    /**
     * Validate date filter values
     */
    private static function validateDateFilterValue(string $operator, mixed $value): string
    {
        if (!strtotime($value)) {
            throw ValidationException::withMessages([
                'value' => ['The filter value must be a valid date.']
            ]);
        }

        return date('Y-m-d', strtotime($value));
    }

    /**
     * Validate option filter values (status, priority)
     */
    private static function validateOptionFilterValue(string $operator, mixed $value, array $options): mixed
    {
        $validOptions = array_column($options['options'] ?? [], 'value');

        if (in_array($operator, ['equals', 'not_equals'])) {
            if (!in_array($value, $validOptions)) {
                throw ValidationException::withMessages([
                    'value' => ['The selected option is invalid.']
                ]);
            }
            return $value;
        }

        if (in_array($operator, ['in', 'not_in'])) {
            if (!is_array($value)) {
                throw ValidationException::withMessages([
                    'value' => ['The filter value must be an array for this operator.']
                ]);
            }

            $invalidValues = array_diff($value, $validOptions);
            if (!empty($invalidValues)) {
                throw ValidationException::withMessages([
                    'value' => ['Some selected options are invalid.']
                ]);
            }

            return $value;
        }

        return $value;
    }

    /**
     * Validate user filter values
     */
    private static function validateUserFilterValue(string $operator, mixed $value): mixed
    {
        if (in_array($operator, ['equals', 'not_equals'])) {
            if (!\App\Models\User::where('id', $value)->exists()) {
                throw ValidationException::withMessages([
                    'value' => ['The selected user does not exist.']
                ]);
            }
            return (int) $value;
        }

        if (in_array($operator, ['in', 'not_in'])) {
            if (!is_array($value)) {
                throw ValidationException::withMessages([
                    'value' => ['The filter value must be an array for this operator.']
                ]);
            }

            $existingUsers = \App\Models\User::whereIn('id', $value)->pluck('id')->toArray();
            $invalidUsers = array_diff($value, $existingUsers);
            
            if (!empty($invalidUsers)) {
                throw ValidationException::withMessages([
                    'value' => ['Some selected users do not exist.']
                ]);
            }

            return $value;
        }

        return $value;
    }

    /**
     * Validate labels filter values
     */
    private static function validateLabelsFilterValue(string $operator, mixed $value, array $options): mixed
    {
        if (!is_string($value)) {
            throw ValidationException::withMessages([
                'value' => ['The filter value must be a string.']
            ]);
        }

        return $value;
    }

    /**
     * Validate checkbox filter values
     */
    private static function validateCheckboxFilterValue(string $operator, mixed $value): bool
    {
        if (!is_bool($value) && !in_array($value, [0, 1, '0', '1'])) {
            throw ValidationException::withMessages([
                'value' => ['The filter value must be true or false.']
            ]);
        }

        return (bool) $value;
    }
}