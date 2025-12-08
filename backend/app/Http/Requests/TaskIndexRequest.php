<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TaskIndexRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Check if user can view tasks in the specified board/workspace
        $boardId = $this->route('board');
        if ($boardId) {
            $board = \App\Models\Board::find($boardId);
            if (!$board) {
                return false;
            }
            return $board->workspace->canUserView(auth()->user());
        }

        $workspaceId = $this->route('workspace');
        if ($workspaceId) {
            $workspace = \App\Models\Workspace::find($workspaceId);
            if (!$workspace) {
                return false;
            }
            return $workspace->canUserView(auth()->user());
        }

        return false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'per_page' => 'sometimes|integer|min:1|max:100',
            'page' => 'sometimes|integer|min:1',
            'cursor' => 'sometimes|string',
            'search' => 'sometimes|string|max:255',
            'status' => 'sometimes|array',
            'status.*' => 'in:todo,in_progress,review,done',
            'priority' => 'sometimes|array',
            'priority.*' => 'in:low,medium,high,urgent',
            'assignee_id' => 'sometimes|array',
            'assignee_id.*' => 'exists:users,id',
            'creator_id' => 'sometimes|array',
            'creator_id.*' => 'exists:users,id',
            'due_date_from' => 'sometimes|date',
            'due_date_to' => 'sometimes|date|after_or_equal:due_date_from',
            'start_date_from' => 'sometimes|date',
            'start_date_to' => 'sometimes|date|after_or_equal:start_date_from',
            'created_at_from' => 'sometimes|date',
            'created_at_to' => 'sometimes|date|after_or_equal:created_at_from',
            'labels' => 'sometimes|array',
            'labels.*' => 'exists:labels,id',
            'sort_by' => 'sometimes|string|in:position,title,status,priority,due_date,start_date,created_at,updated_at',
            'sort_order' => 'sometimes|string|in:asc,desc',
            'include_archived' => 'sometimes|boolean',
            'include' => 'sometimes|array',
            'include.*' => 'in:labels,custom_values,assignee,creator,board,workspace,comments',
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
            'per_page.integer' => 'Per page must be an integer',
            'per_page.min' => 'Per page must be at least 1',
            'per_page.max' => 'Per page may not be greater than 100',
            'page.integer' => 'Page must be an integer',
            'page.min' => 'Page must be at least 1',
            'search.max' => 'Search term may not be greater than 255 characters',
            'status.*.in' => 'Status must be one of: todo, in_progress, review, done',
            'priority.*.in' => 'Priority must be one of: low, medium, high, urgent',
            'assignee_id.*.exists' => 'Selected assignee does not exist',
            'creator_id.*.exists' => 'Selected creator does not exist',
            'due_date_to.after_or_equal' => 'Due date to must be after or equal to due date from',
            'start_date_to.after_or_equal' => 'Start date to must be after or equal to start date from',
            'created_at_to.after_or_equal' => 'Created date to must be after or equal to created date from',
            'labels.*.exists' => 'Selected label does not exist',
            'sort_by.in' => 'Sort by must be one of: position, title, status, priority, due_date, start_date, created_at, updated_at',
            'sort_order.in' => 'Sort order must be either asc or desc',
            'include.*.in' => 'Include must be one of: labels, custom_values, assignee, creator, board, workspace, comments',
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
            'per_page' => 'per page',
            'page' => 'page',
            'cursor' => 'cursor',
            'search' => 'search term',
            'status' => 'status',
            'priority' => 'priority',
            'assignee_id' => 'assignee',
            'creator_id' => 'creator',
            'due_date_from' => 'due date from',
            'due_date_to' => 'due date to',
            'start_date_from' => 'start date from',
            'start_date_to' => 'start date to',
            'created_at_from' => 'created date from',
            'created_at_to' => 'created date to',
            'labels' => 'labels',
            'sort_by' => 'sort by',
            'sort_order' => 'sort order',
            'include_archived' => 'include archived',
            'include' => 'include',
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
            // Validate that assignees belong to the workspace
            if ($this->has('assignee_id')) {
                $workspaceId = $this->route('workspace') ?: $this->getWorkspaceFromBoard();
                $assigneeIds = $this->input('assignee_id', []);
                
                if ($workspaceId && !empty($assigneeIds)) {
                    $workspace = \App\Models\Workspace::find($workspaceId);
                    if ($workspace) {
                        $workspaceUserIds = $workspace->users()->pluck('users.id')->toArray();
                        $invalidAssignees = array_diff($assigneeIds, $workspaceUserIds);
                        
                        if (!empty($invalidAssignees)) {
                            $validator->errors()->add('assignee_id', 'Some selected assignees do not belong to the workspace.');
                        }
                    }
                }
            }

            // Validate that creators belong to the workspace
            if ($this->has('creator_id')) {
                $workspaceId = $this->route('workspace') ?: $this->getWorkspaceFromBoard();
                $creatorIds = $this->input('creator_id', []);
                
                if ($workspaceId && !empty($creatorIds)) {
                    $workspace = \App\Models\Workspace::find($workspaceId);
                    if ($workspace) {
                        $workspaceUserIds = $workspace->users()->pluck('users.id')->toArray();
                        $invalidCreators = array_diff($creatorIds, $workspaceUserIds);
                        
                        if (!empty($invalidCreators)) {
                            $validator->errors()->add('creator_id', 'Some selected creators do not belong to the workspace.');
                        }
                    }
                }
            }

            // Validate that labels belong to the workspace
            if ($this->has('labels')) {
                $workspaceId = $this->route('workspace') ?: $this->getWorkspaceFromBoard();
                $labelIds = $this->input('labels', []);
                
                if ($workspaceId && !empty($labelIds)) {
                    $workspace = \App\Models\Workspace::find($workspaceId);
                    if ($workspace) {
                        $workspaceLabelIds = $workspace->labels()->pluck('labels.id')->toArray();
                        $invalidLabels = array_diff($labelIds, $workspaceLabelIds);
                        
                        if (!empty($invalidLabels)) {
                            $validator->errors()->add('labels', 'Some selected labels do not belong to the workspace.');
                        }
                    }
                }
            }
        });
    }

    /**
     * Get workspace ID from board if board is provided in route
     *
     * @return int|null
     */
    private function getWorkspaceFromBoard(): ?int
    {
        $boardId = $this->route('board');
        if ($boardId) {
            $board = \App\Models\Board::find($boardId);
            return $board ? $board->workspace_id : null;
        }
        return null;
    }
}