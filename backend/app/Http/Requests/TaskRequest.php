<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TaskRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // For create requests, check if user can create tasks in the board/workspace
        if ($this->isMethod('POST')) {
            $boardId = $this->input('board_id');
            if (!$boardId) {
                return false;
            }
            
            $board = \App\Models\Board::find($boardId);
            if (!$board) {
                return false;
            }
            
            return $board->workspace->canUserCreateBoards(auth()->user());
        }

        // For update/delete requests, check if user can manage the task
        $task = $this->route('task');
        if (!$task) {
            return false;
        }

        // User can manage tasks they created or are assigned to,
        // or if they can manage the workspace
        return $task->creator_id === auth()->id() || 
               $task->assignee_id === auth()->id() ||
               $task->workspace->canUserManage(auth()->user());
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $rules = [
            'board_id' => 'required|exists:boards,id',
            'workspace_id' => 'required|exists:workspaces,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'status' => 'sometimes|in:todo,in_progress,review,done,archived',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'assignee_id' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'start_date' => 'nullable|date',
            'position' => 'sometimes|numeric|min:0',
            'labels' => 'sometimes|array',
            'labels.*' => 'exists:labels,id',
            'custom_values' => 'sometimes|array',
            'custom_values.*.field_name' => 'required|string|max:255',
            'custom_values.*.field_type' => 'required|in:text,number,date,select',
            'custom_values.*.value' => 'required',
        ];

        // Additional validation for custom values based on field type
        if ($this->has('custom_values')) {
            foreach ($this->input('custom_values', []) as $index => $customValue) {
                if (isset($customValue['field_type'])) {
                    switch ($customValue['field_type']) {
                        case 'number':
                            $rules["custom_values.{$index}.value"] = 'required|numeric';
                            break;
                        case 'date':
                            $rules["custom_values.{$index}.value"] = 'required|date';
                            break;
                        case 'select':
                            $rules["custom_values.{$index}.value"] = 'required|array';
                            break;
                        default:
                            $rules["custom_values.{$index}.value"] = 'required|string';
                            break;
                    }
                }
            }
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'board_id.required' => 'Board is required',
            'board_id.exists' => 'Selected board does not exist',
            'workspace_id.required' => 'Workspace is required',
            'workspace_id.exists' => 'Selected workspace does not exist',
            'title.required' => 'Task title is required',
            'title.max' => 'Task title may not be greater than 255 characters',
            'description.max' => 'Description may not be greater than 5000 characters',
            'status.in' => 'Status must be one of: todo, in_progress, review, done, archived',
            'priority.in' => 'Priority must be one of: low, medium, high, urgent',
            'assignee_id.exists' => 'Selected assignee does not exist',
            'due_date.after_or_equal' => 'Due date must be after or equal to start date',
            'position.numeric' => 'Position must be a number',
            'position.min' => 'Position must be at least 0',
            'labels.*.exists' => 'Selected label does not exist',
            'custom_values.*.field_name.required' => 'Custom field name is required',
            'custom_values.*.field_type.required' => 'Custom field type is required',
            'custom_values.*.field_type.in' => 'Custom field type must be one of: text, number, date, select',
            'custom_values.*.value.required' => 'Custom field value is required',
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
            'board_id' => 'board',
            'workspace_id' => 'workspace',
            'title' => 'task title',
            'description' => 'description',
            'status' => 'status',
            'priority' => 'priority',
            'assignee_id' => 'assignee',
            'due_date' => 'due date',
            'start_date' => 'start date',
            'position' => 'position',
            'labels' => 'labels',
            'custom_values' => 'custom values',
        ];
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Validate that the board belongs to the specified workspace
            if ($this->has('board_id') && $this->has('workspace_id')) {
                $board = \App\Models\Board::find($this->input('board_id'));
                if ($board && $board->workspace_id != $this->input('workspace_id')) {
                    $validator->errors()->add('board_id', 'The selected board does not belong to the specified workspace.');
                }
            }

            // Validate that the assignee belongs to the workspace
            if ($this->has('assignee_id') && $this->has('workspace_id')) {
                $workspace = \App\Models\Workspace::find($this->input('workspace_id'));
                $assignee = \App\Models\User::find($this->input('assignee_id'));
                
                if ($workspace && $assignee && !$workspace->users()->where('users.id', $assignee->id)->exists()) {
                    $validator->errors()->add('assignee_id', 'The selected assignee does not belong to the specified workspace.');
                }
            }

            // Validate that labels belong to the workspace
            if ($this->has('labels') && $this->has('workspace_id')) {
                $workspace = \App\Models\Workspace::find($this->input('workspace_id'));
                $labelIds = $this->input('labels', []);
                
                if ($workspace && !empty($labelIds)) {
                    $workspaceLabelIds = $workspace->labels()->pluck('labels.id')->toArray();
                    $invalidLabels = array_diff($labelIds, $workspaceLabelIds);
                    
                    if (!empty($invalidLabels)) {
                        $validator->errors()->add('labels', 'Some selected labels do not belong to the specified workspace.');
                    }
                }
            }
        });
    }
}