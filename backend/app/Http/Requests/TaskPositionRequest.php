<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TaskPositionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Check if user can update tasks in the board/workspace
        $task = $this->route('task');
        if (!$task) {
            return false;
        }

        // User can update position if they created the task, are assigned to it,
        // or can manage the workspace
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
        return [
            'position' => 'required|numeric|min:0',
            'board_id' => 'sometimes|exists:boards,id',
            'status' => 'sometimes|in:todo,in_progress,review,done',
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
            'position.required' => 'Position is required',
            'position.numeric' => 'Position must be a number',
            'position.min' => 'Position must be at least 0',
            'board_id.exists' => 'Selected board does not exist',
            'status.in' => 'Status must be one of: todo, in_progress, review, done',
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
            'position' => 'position',
            'board_id' => 'board',
            'status' => 'status',
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
            // Validate that the board belongs to the same workspace as the task
            if ($this->has('board_id')) {
                $task = $this->route('task');
                $board = \App\Models\Board::find($this->input('board_id'));
                
                if ($task && $board && $board->workspace_id !== $task->workspace_id) {
                    $validator->errors()->add('board_id', 'The selected board does not belong to the same workspace as the task.');
                }
            }
        });
    }
}