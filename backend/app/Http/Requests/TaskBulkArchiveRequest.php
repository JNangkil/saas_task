<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TaskBulkArchiveRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization is handled in the controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'task_ids' => 'required|array|min:1|max:100',
            'task_ids.*' => 'exists:tasks,id',
            'async' => 'sometimes|boolean',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'task_ids.required' => 'Task IDs are required',
            'task_ids.array' => 'Task IDs must be an array',
            'task_ids.min' => 'At least one task ID is required',
            'task_ids.max' => 'Cannot process more than 100 tasks at once',
            'task_ids.*.exists' => 'One or more selected tasks do not exist',
            'async.boolean' => 'Async flag must be a boolean',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'task_ids' => 'task IDs',
            'async' => 'async processing',
        ];
    }
}