<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TaskBulkUpdateRequest extends FormRequest
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
            'updates' => 'required|array|min:1',
            'updates.title' => 'sometimes|string|max:255',
            'updates.description' => 'sometimes|string|max:5000',
            'updates.status' => 'sometimes|in:todo,in_progress,review,done,archived',
            'updates.priority' => 'sometimes|in:low,medium,high,urgent',
            'updates.assignee_id' => 'nullable|exists:users,id',
            'updates.due_date' => 'nullable|date|after_or_equal:updates.start_date',
            'updates.start_date' => 'nullable|date',
            'updates.board_id' => 'sometimes|exists:boards,id',
            'updates.position' => 'sometimes|numeric|min:0',
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
            'updates.required' => 'Update data is required',
            'updates.array' => 'Update data must be an array',
            'updates.min' => 'At least one field must be updated',
            'updates.title.string' => 'Title must be a string',
            'updates.title.max' => 'Title may not be greater than 255 characters',
            'updates.description.string' => 'Description must be a string',
            'updates.description.max' => 'Description may not be greater than 5000 characters',
            'updates.status.in' => 'Status must be one of: todo, in_progress, review, done, archived',
            'updates.priority.in' => 'Priority must be one of: low, medium, high, urgent',
            'updates.assignee_id.exists' => 'Selected assignee does not exist',
            'updates.due_date.date' => 'Due date must be a valid date',
            'updates.due_date.after_or_equal' => 'Due date must be after or equal to start date',
            'updates.start_date.date' => 'Start date must be a valid date',
            'updates.board_id.exists' => 'Selected board does not exist',
            'updates.position.numeric' => 'Position must be a number',
            'updates.position.min' => 'Position must be at least 0',
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
            'updates' => 'updates',
            'updates.title' => 'title',
            'updates.description' => 'description',
            'updates.status' => 'status',
            'updates.priority' => 'priority',
            'updates.assignee_id' => 'assignee',
            'updates.due_date' => 'due date',
            'updates.start_date' => 'start date',
            'updates.board_id' => 'board',
            'updates.position' => 'position',
            'async' => 'async processing',
        ];
    }
}