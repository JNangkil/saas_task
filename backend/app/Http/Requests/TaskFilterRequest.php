<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class TaskFilterRequest extends FormRequest
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
            'filters' => 'required|array|min:1',
            'filters.*.type' => 'required|in:filter,group',
            'filters.*.column' => 'required|string|max:255',
            'filters.*.column_type' => 'required|string|in:text,long_text,number,currency,percentage,date,datetime,status,priority,assignee,labels,checkbox,url,email,phone',
            'filters.*.operator' => 'required|string',
            'filters.*.value' => 'nullable',
            'filters.*.logic' => 'sometimes|in:AND,OR',
            'filters.*.filters' => 'required_if:filters.*.type,group|array|min:1',
            'filters.*.filters.*.type' => 'required_if:filters.*.type,group|in:filter,group',
            'filters.*.filters.*.column' => 'required_if:filters.*.filters.*.type,filter|string|max:255',
            'filters.*.filters.*.column_type' => 'required_if:filters.*.filters.*.type,filter|string|in:text,long_text,number,currency,percentage,date,datetime,status,priority,assignee,labels,checkbox,url,email,phone',
            'filters.*.filters.*.operator' => 'required_if:filters.*.filters.*.type,filter|string',
            'filters.*.filters.*.value' => 'nullable',
            'filters.*.filters.*.logic' => 'sometimes|in:AND,OR',
            'per_page' => 'sometimes|integer|min:1|max:100',
            'page' => 'sometimes|integer|min:1',
            'cursor' => 'sometimes|string',
            'sort_by' => 'sometimes|string|max:255',
            'sort_order' => 'sometimes|string|in:asc,desc',
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
            'filters.required' => 'At least one filter is required',
            'filters.array' => 'Filters must be an array',
            'filters.min' => 'At least one filter is required',
            'filters.*.type.required' => 'Filter type is required',
            'filters.*.type.in' => 'Filter type must be either filter or group',
            'filters.*.column.required' => 'Column name is required',
            'filters.*.column.string' => 'Column name must be a string',
            'filters.*.column.max' => 'Column name may not be greater than 255 characters',
            'filters.*.column_type.required' => 'Column type is required',
            'filters.*.column_type.in' => 'Invalid column type',
            'filters.*.operator.required' => 'Operator is required',
            'filters.*.operator.string' => 'Operator must be a string',
            'filters.*.logic.in' => 'Logic must be either AND or OR',
            'filters.*.filters.required_if' => 'Filter group must contain filters',
            'filters.*.filters.array' => 'Group filters must be an array',
            'filters.*.filters.min' => 'Filter group must contain at least one filter',
            'per_page.integer' => 'Per page must be an integer',
            'per_page.min' => 'Per page must be at least 1',
            'per_page.max' => 'Per page may not be greater than 100',
            'page.integer' => 'Page must be an integer',
            'page.min' => 'Page must be at least 1',
            'sort_by.string' => 'Sort by must be a string',
            'sort_by.max' => 'Sort by may not be greater than 255 characters',
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
            'filters' => 'filters',
            'filters.*.type' => 'filter type',
            'filters.*.column' => 'column',
            'filters.*.column_type' => 'column type',
            'filters.*.operator' => 'operator',
            'filters.*.value' => 'value',
            'filters.*.logic' => 'logic',
            'filters.*.filters' => 'group filters',
            'per_page' => 'per page',
            'page' => 'page',
            'cursor' => 'cursor',
            'sort_by' => 'sort by',
            'sort_order' => 'sort order',
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
            $this->validateFilterStructure($validator);
            $this->validateFilterOperators($validator);
            $this->validateFilterValues($validator);
            $this->validateNestedGroups($validator);
        });
    }

    /**
     * Validate the overall filter structure
     *
     * @param \Illuminate\Validation\Validator $validator
     */
    protected function validateFilterStructure($validator): void
    {
        $filters = $this->input('filters', []);

        foreach ($filters as $index => $filter) {
            if (!isset($filter['type'])) {
                $validator->errors()->add("filters.{$index}.type", 'Filter type is required');
                continue;
            }

            if ($filter['type'] === 'filter') {
                $requiredFields = ['column', 'column_type', 'operator'];
                foreach ($requiredFields as $field) {
                    if (!isset($filter[$field])) {
                        $validator->errors()->add("filters.{$index}.{$field}", ucfirst($field) . ' is required for filters');
                    }
                }
            } elseif ($filter['type'] === 'group') {
                if (!isset($filter['filters']) || !is_array($filter['filters'])) {
                    $validator->errors()->add("filters.{$index}.filters", 'Filter groups must contain a filters array');
                }
            }
        }
    }

    /**
     * Validate filter operators against column types
     *
     * @param \Illuminate\Validation\Validator $validator
     */
    protected function validateFilterOperators($validator): void
    {
        $filters = $this->input('filters', []);
        $filterBuilder = app(\App\Services\FilterBuilder::class);

        foreach ($filters as $index => $filter) {
            if ($filter['type'] !== 'filter') {
                continue;
            }

            $columnType = $filter['column_type'] ?? '';
            $operator = $filter['operator'] ?? '';

            if (!$filterBuilder->isOperatorValid($columnType, $operator)) {
                $availableOperators = implode(', ', $filterBuilder->getAvailableOperators($columnType));
                $validator->errors()->add(
                    "filters.{$index}.operator",
                    "Operator '{$operator}' is not valid for column type '{$columnType}'. Available operators: {$availableOperators}"
                );
            }
        }
    }

    /**
     * Validate filter values based on operators and column types
     *
     * @param \Illuminate\Validation\Validator $validator
     */
    protected function validateFilterValues($validator): void
    {
        $filters = $this->input('filters', []);

        foreach ($filters as $index => $filter) {
            if ($filter['type'] !== 'filter') {
                continue;
            }

            $columnType = $filter['column_type'] ?? '';
            $operator = $filter['operator'] ?? '';
            $value = $filter['value'] ?? null;

            // Check if value is required for this operator
            $operatorsRequiringValue = [
                'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
                'greater_than', 'less_than', 'greater_equal', 'less_equal', 'in', 'not_in'
            ];

            if (in_array($operator, $operatorsRequiringValue) && ($value === null || $value === '')) {
                $validator->errors()->add(
                    "filters.{$index}.value",
                    "Value is required for operator '{$operator}'"
                );
            }

            // Validate array values for in/not_in operators
            if (in_array($operator, ['in', 'not_in']) && !is_array($value)) {
                $validator->errors()->add(
                    "filters.{$index}.value",
                    "Value must be an array for operator '{$operator}'"
                );
            }

            // Validate numeric values for numeric operators
            if (in_array($operator, ['greater_than', 'less_than', 'greater_equal', 'less_equal']) && 
                in_array($columnType, ['number', 'currency', 'percentage']) && 
                !is_numeric($value)) {
                $validator->errors()->add(
                    "filters.{$index}.value",
                    "Value must be numeric for operator '{$operator}' with column type '{$columnType}'"
                );
            }
        }
    }

    /**
     * Validate nested filter groups
     *
     * @param \Illuminate\Validation\Validator $validator
     */
    protected function validateNestedGroups($validator): void
    {
        $filters = $this->input('filters', []);

        foreach ($filters as $index => $filter) {
            if ($filter['type'] === 'group') {
                $this->validateFilterGroup($validator, $filter['filters'] ?? [], "filters.{$index}.filters");
            }
        }
    }

    /**
     * Validate a specific filter group recursively
     *
     * @param \Illuminate\Validation\Validator $validator
     * @param array $groupFilters
     * @param string $prefix
     */
    protected function validateFilterGroup($validator, array $groupFilters, string $prefix): void
    {
        foreach ($groupFilters as $index => $filter) {
            $currentPrefix = "{$prefix}.{$index}";

            if (!isset($filter['type'])) {
                $validator->errors()->add("{$currentPrefix}.type", 'Filter type is required');
                continue;
            }

            if ($filter['type'] === 'filter') {
                $requiredFields = ['column', 'column_type', 'operator'];
                foreach ($requiredFields as $field) {
                    if (!isset($filter[$field])) {
                        $validator->errors()->add("{$currentPrefix}.{$field}", ucfirst($field) . ' is required for filters');
                    }
                }
            } elseif ($filter['type'] === 'group') {
                if (!isset($filter['filters']) || !is_array($filter['filters'])) {
                    $validator->errors()->add("{$currentPrefix}.filters", 'Filter groups must contain a filters array');
                } else {
                    $this->validateFilterGroup($validator, $filter['filters'], "{$currentPrefix}.filters");
                }
            }
        }
    }

    /**
     * Get validated filters with proper structure
     *
     * @return array
     */
    public function getValidatedFilters(): array
    {
        $filters = $this->validated()['filters'];
        
        // Ensure all filters have required default values
        array_walk_recursive($filters, function (&$value, $key) {
            if ($key === 'logic' && !isset($value)) {
                $value = 'AND';
            }
        });

        return $filters;
    }

    /**
     * Get pagination parameters
     *
     * @return array
     */
    public function getPaginationParams(): array
    {
        return [
            'per_page' => $this->input('per_page', 15),
            'page' => $this->input('page'),
            'cursor' => $this->input('cursor'),
        ];
    }

    /**
     * Get sorting parameters
     *
     * @return array
     */
    public function getSortingParams(): array
    {
        return [
            'sort_by' => $this->input('sort_by', 'position'),
            'sort_order' => $this->input('sort_order', 'asc'),
        ];
    }

    /**
     * Get include parameters
     *
     * @return array
     */
    public function getIncludeParams(): array
    {
        return $this->input('include', []);
    }
}