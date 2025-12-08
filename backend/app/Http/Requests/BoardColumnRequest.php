<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;
use App\Services\ColumnTypeValidator;
use App\Enums\ColumnType;

class BoardColumnRequest extends FormRequest
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
        $method = $this->method();
        $isUpdate = in_array($method, ['PUT', 'PATCH']);

        return [
            'name' => $isUpdate ? 'sometimes|string|max:255' : 'required|string|max:255',
            'type' => $isUpdate ? 'sometimes|string|in:' . implode(',', array_column(ColumnType::cases(), 'value')) : 'required|string|in:' . implode(',', array_column(ColumnType::cases(), 'value')),
            'options' => 'sometimes|array',
            'order' => 'sometimes|integer|min:1',
            'pinned' => 'sometimes|boolean',
            'width' => 'sometimes|integer|min:50|max:500',
            'description' => 'nullable|string|max:500',
        ];
    }

    /**
     * Get custom error messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Column name is required.',
            'name.string' => 'Column name must be a string.',
            'name.max' => 'Column name may not be greater than 255 characters.',
            'type.required' => 'Column type is required.',
            'type.in' => 'Selected column type is invalid.',
            'options.array' => 'Column options must be an array.',
            'order.integer' => 'Column order must be an integer.',
            'order.min' => 'Column order must be at least 1.',
            'pinned.boolean' => 'Column pinned status must be true or false.',
            'width.integer' => 'Column width must be an integer.',
            'width.min' => 'Column width must be at least 50 pixels.',
            'width.max' => 'Column width may not be greater than 500 pixels.',
            'description.string' => 'Column description must be a string.',
            'description.max' => 'Column description may not be greater than 500 characters.',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $this->validateColumnType($validator);
            $this->validateColumnOptions($validator);
            $this->validateColumnOrder($validator);
            $this->validateUniqueName($validator);
        });
    }

    /**
     * Validate column type
     */
    protected function validateColumnType($validator): void
    {
        $type = $this->input('type');
        
        if ($type && !ColumnTypeValidator::validateColumnType($type)) {
            $validator->errors()->add('type', 'Invalid column type specified.');
        }
    }

    /**
     * Validate column options based on type
     */
    protected function validateColumnOptions($validator): void
    {
        $type = $this->input('type');
        $options = $this->input('options', []);

        if (!$type) {
            return;
        }

        try {
            if (!empty($options)) {
                $validatedOptions = ColumnTypeValidator::validateColumnOptions($type, $options);
                $this->merge(['options' => $validatedOptions]);
            }
        } catch (ValidationException $e) {
            foreach ($e->errors() as $field => $errors) {
                foreach ($errors as $error) {
                    $validator->errors()->add("options.{$field}", $error);
                }
            }
        }
    }

    /**
     * Validate column order uniqueness
     */
    protected function validateColumnOrder($validator): void
    {
        $order = $this->input('order');
        $boardId = $this->route('board');
        $columnId = $this->route('column');

        if (!$order || !$boardId) {
            return;
        }

        $query = \App\Models\BoardColumn::where('board_id', $boardId)
            ->where('order', $order);

        // Exclude current column when updating
        if ($columnId) {
            $query->where('id', '!=', $columnId);
        }

        if ($query->exists()) {
            $validator->errors()->add('order', 'A column with this order already exists in this board.');
        }
    }

    /**
     * Validate column name uniqueness within board
     */
    protected function validateUniqueName($validator): void
    {
        $name = $this->input('name');
        $boardId = $this->route('board');
        $columnId = $this->route('column');

        if (!$name || !$boardId) {
            return;
        }

        $query = \App\Models\BoardColumn::where('board_id', $boardId)
            ->where('name', $name);

        // Exclude current column when updating
        if ($columnId) {
            $query->where('id', '!=', $columnId);
        }

        if ($query->exists()) {
            $validator->errors()->add('name', 'A column with this name already exists in this board.');
        }
    }

    /**
     * Get validated data with proper defaults
     */
    public function getValidatedData(): array
    {
        $data = $this->validated();
        
        // Set default options if not provided
        if (!isset($data['options']) && isset($data['type'])) {
            $columnType = ColumnType::from($data['type']);
            $data['options'] = $columnType->getDefaultOptions();
        }

        // Set default width if not provided
        if (!isset($data['width']) && isset($data['type'])) {
            $data['width'] = \App\Services\ColumnTypeConfiguration::getDefaultWidth($data['type']);
        }

        // Set default values
        $data['pinned'] = $data['pinned'] ?? false;
        
        return $data;
    }

    /**
     * Get column configuration for API response
     */
    public function getColumnConfiguration(): array
    {
        $data = $this->getValidatedData();
        
        if (!isset($data['type'])) {
            return [];
        }

        return \App\Services\ColumnTypeConfiguration::getTypeConfiguration($data['type']);
    }
}