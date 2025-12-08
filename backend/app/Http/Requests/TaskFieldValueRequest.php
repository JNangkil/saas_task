<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;
use App\Services\ColumnTypeValidator;
use App\Enums\ColumnType;

class TaskFieldValueRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'values' => 'required|array',
            'values.*.column_id' => 'required|integer|exists:board_columns,id',
            'values.*.value' => 'nullable',
        ];
    }

    /**
     * Get custom error messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'values.required' => 'Field values are required.',
            'values.array' => 'Field values must be an array.',
            'values.*.column_id.required' => 'Column ID is required for each field value.',
            'values.*.column_id.integer' => 'Column ID must be an integer.',
            'values.*.column_id.exists' => 'Selected column does not exist.',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $this->validateFieldValues($validator);
            $this->validateColumnAccess($validator);
            $this->validateRequiredFields($validator);
        });
    }

    /**
     * Validate each field value against its column type and options
     */
    protected function validateFieldValues($validator): void
    {
        $values = $this->input('values', []);

        foreach ($values as $index => $fieldData) {
            $columnId = $fieldData['column_id'] ?? null;
            $value = $fieldData['value'] ?? null;

            if (!$columnId) {
                continue;
            }

            $column = \App\Models\BoardColumn::find($columnId);
            if (!$column) {
                continue;
            }

            try {
                $validatedValue = ColumnTypeValidator::validateFieldValue(
                    $column->type,
                    $value,
                    $column->options ?? []
                );
                
                // Update the value with validated/formatted version
                $this->merge(["values.{$index}.value" => $validatedValue]);
            } catch (ValidationException $e) {
                foreach ($e->errors() as $field => $errors) {
                    foreach ($errors as $error) {
                        $validator->errors()->add("values.{$index}.value", $error);
                    }
                }
            }
        }
    }

    /**
     * Validate that the user has access to update values for these columns
     */
    protected function validateColumnAccess($validator): void
    {
        $values = $this->input('values', []);
        $taskId = $this->route('task');

        if (!$taskId) {
            return;
        }

        $task = \App\Models\Task::find($taskId);
        if (!$task) {
            return;
        }

        // Get all column IDs from the request
        $columnIds = collect($values)->pluck('column_id')->unique()->toArray();

        // Verify all columns belong to the same board as the task
        $columns = \App\Models\BoardColumn::whereIn('id', $columnIds)->get();
        $boardIds = $columns->pluck('board_id')->unique();

        if ($boardIds->count() > 1 || !$boardIds->contains($task->board_id)) {
            $validator->errors()->add('values', 'One or more columns do not belong to this task\'s board.');
        }
    }

    /**
     * Validate that all required fields have values
     */
    protected function validateRequiredFields($validator): void
    {
        $values = $this->input('values', []);
        $columnIds = collect($values)->pluck('column_id')->unique();

        // Get all required columns for this task's board
        $requiredColumns = \App\Models\BoardColumn::whereIn('id', $columnIds)
            ->whereJsonContains('options->required', true)
            ->get();

        foreach ($requiredColumns as $column) {
            $fieldValue = collect($values)->firstWhere('column_id', $column->id);
            
            if (!$fieldValue || $fieldValue['value'] === null || $fieldValue['value'] === '') {
                $index = collect($values)->search(function ($item) use ($column) {
                    return ($item['column_id'] ?? null) === $column->id;
                });
                
                if ($index !== false) {
                    $validator->errors()->add("values.{$index}.value", "The {$column->name} field is required.");
                }
            }
        }
    }

    /**
     * Get validated and formatted field values
     */
    public function getValidatedValues(): array
    {
        $values = $this->input('values', []);
        $formattedValues = [];

        foreach ($values as $fieldData) {
            $columnId = $fieldData['column_id'];
            $value = $fieldData['value'];
            $column = \App\Models\BoardColumn::find($columnId);

            if (!$column) {
                continue;
            }

            // Format value for storage
            $formattedValues[] = [
                'column_id' => $columnId,
                'value' => $this->formatValueForStorage($column->type, $value, $column->options ?? []),
            ];
        }

        return $formattedValues;
    }

    /**
     * Format value for storage in the database
     */
    protected function formatValueForStorage(string $type, mixed $value, array $options): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        $columnType = ColumnType::from($type);

        return match($columnType) {
            ColumnType::TEXT, ColumnType::LONG_TEXT, ColumnType::URL, ColumnType::EMAIL, ColumnType::PHONE => trim($value),
            ColumnType::NUMBER, ColumnType::CURRENCY, ColumnType::PERCENTAGE => (float) $value,
            ColumnType::DATE => $value instanceof \Carbon\Carbon ? $value->format('Y-m-d') : date('Y-m-d', strtotime($value)),
            ColumnType::DATETIME => $value instanceof \Carbon\Carbon ? $value->format('Y-m-d H:i:s') : date('Y-m-d H:i:s', strtotime($value)),
            ColumnType::STATUS, ColumnType::PRIORITY => (string) $value,
            ColumnType::ASSIGNEE => (int) $value,
            ColumnType::LABELS => is_array($value) ? array_unique(array_filter($value)) : [],
            ColumnType::CHECKBOX => (bool) $value,
            default => $value,
        };
    }

    /**
     * Get field values as a key-value array for easy processing
     */
    public function getValuesMap(): array
    {
        $values = $this->getValidatedValues();
        $map = [];

        foreach ($values as $fieldValue) {
            $map[$fieldValue['column_id']] = $fieldValue['value'];
        }

        return $map;
    }

    /**
     * Validate a single field value (for API endpoint that updates one field at a time)
     */
    public function validateSingleField(): array
    {
        $columnId = $this->input('column_id');
        $value = $this->input('value');

        $this->validate([
            'column_id' => 'required|integer|exists:board_columns,id',
            'value' => 'nullable',
        ], [
            'column_id.required' => 'Column ID is required.',
            'column_id.integer' => 'Column ID must be an integer.',
            'column_id.exists' => 'Selected column does not exist.',
        ]);

        $column = \App\Models\BoardColumn::find($columnId);
        
        if (!$column) {
            throw ValidationException::withMessages(['column_id' => 'Column not found.']);
        }

        try {
            $validatedValue = ColumnTypeValidator::validateFieldValue(
                $column->type,
                $value,
                $column->options ?? []
            );

            return [
                'column_id' => $columnId,
                'value' => $this->formatValueForStorage($column->type, $validatedValue, $column->options ?? []),
            ];
        } catch (ValidationException $e) {
            throw $e;
        }
    }

    /**
     * Get the task and board context for this request
     */
    public function getTaskContext(): ?\App\Models\Task
    {
        $taskId = $this->route('task');
        return $taskId ? \App\Models\Task::find($taskId) : null;
    }

    /**
     * Check if the request is for bulk update or single field update
     */
    public function isBulkUpdate(): bool
    {
        return $this->has('values');
    }

    /**
     * Get the column information for validation context
     */
    public function getColumnContext(int $columnId): ?\App\Models\BoardColumn
    {
        return \App\Models\BoardColumn::find($columnId);
    }
}