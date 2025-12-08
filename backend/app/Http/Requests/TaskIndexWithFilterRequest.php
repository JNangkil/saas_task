<?php

namespace App\Http\Requests;

class TaskIndexWithFilterRequest extends TaskIndexRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return parent::authorize();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        // Merge parent rules with filter-specific rules
        $parentRules = parent::rules();
        
        $filterRules = [
            'filters' => 'sometimes|array',
            'filters_json' => 'sometimes|string|max:10000', // For JSON string format
            'saved_filter_id' => 'sometimes|integer|exists:saved_filters,id',
            'filter_name' => 'sometimes|string|max:255|required_with:save_filter',
            'save_filter' => 'sometimes|boolean',
            'is_public' => 'sometimes|boolean',
        ];

        return array_merge($parentRules, $filterRules);
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        $parentMessages = parent::messages();
        
        $filterMessages = [
            'filters.array' => 'Filters must be an array',
            'filters_json.string' => 'Filters JSON must be a string',
            'filters_json.max' => 'Filters JSON may not be greater than 10000 characters',
            'saved_filter_id.integer' => 'Saved filter ID must be an integer',
            'saved_filter_id.exists' => 'Selected saved filter does not exist',
            'filter_name.string' => 'Filter name must be a string',
            'filter_name.max' => 'Filter name may not be greater than 255 characters',
            'filter_name.required_with' => 'Filter name is required when saving a filter',
            'save_filter.boolean' => 'Save filter must be a boolean',
            'is_public.boolean' => 'Is public must be a boolean',
        ];

        return array_merge($parentMessages, $filterMessages);
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        $parentAttributes = parent::attributes();
        
        $filterAttributes = [
            'filters' => 'filters',
            'filters_json' => 'filters JSON',
            'saved_filter_id' => 'saved filter ID',
            'filter_name' => 'filter name',
            'save_filter' => 'save filter',
            'is_public' => 'is public',
        ];

        return array_merge($parentAttributes, $filterAttributes);
    }

    /**
     * Configure the validator instance.
     *
     * @param  \Illuminate\Validation\Validator  $validator
     * @return void
     */
    public function withValidator($validator)
    {
        parent::withValidator($validator);

        $validator->after(function ($validator) {
            $this->validateFilterInput($validator);
            $this->validateSavedFilterAccess($validator);
            $this->validateFilterName($validator);
        });
    }

    /**
     * Validate filter input format
     *
     * @param \Illuminate\Validation\Validator $validator
     */
    protected function validateFilterInput($validator): void
    {
        $hasFilters = $this->has('filters');
        $hasFiltersJson = $this->has('filters_json');

        // Either filters array or filters_json should be provided, not both
        if ($hasFilters && $hasFiltersJson) {
            $validator->errors()->add('filters', 'Cannot provide both filters array and filters JSON');
            return;
        }

        // If filters_json is provided, validate it's valid JSON
        if ($hasFiltersJson) {
            $filtersJson = $this->input('filters_json');
            json_decode($filtersJson);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                $validator->errors()->add('filters_json', 'Invalid JSON format: ' . json_last_error_msg());
            }
        }
    }

    /**
     * Validate that user has access to the saved filter
     *
     * @param \Illuminate\Validation\Validator $validator
     */
    protected function validateSavedFilterAccess($validator): void
    {
        if (!$this->has('saved_filter_id')) {
            return;
        }

        $savedFilterId = $this->input('saved_filter_id');
        $user = auth()->user();

        if (!$user) {
            return;
        }

        $savedFilter = \App\Models\SavedFilter::find($savedFilterId);
        
        if (!$savedFilter) {
            return;
        }

        // Check if user owns the filter or if it's public
        if ($savedFilter->user_id !== $user->id && !$savedFilter->is_public) {
            $validator->errors()->add('saved_filter_id', 'You do not have access to this saved filter');
        }
    }

    /**
     * Validate filter name for saving
     *
     * @param \Illuminate\Validation\Validator $validator
     */
    protected function validateFilterName($validator): void
    {
        if (!$this->input('save_filter', false)) {
            return;
        }

        $filterName = $this->input('filter_name');
        $user = auth()->user();

        if (!$user || !$filterName) {
            return;
        }

        // Check if user already has a filter with this name
        $existingFilter = \App\Models\SavedFilter::where('user_id', $user->id)
            ->where('name', $filterName)
            ->first();

        if ($existingFilter) {
            $validator->errors()->add('filter_name', 'You already have a saved filter with this name');
        }
    }

    /**
     * Get parsed filters from request
     *
     * @return array
     */
    public function getFilters(): array
    {
        if ($this->has('filters')) {
            return $this->input('filters', []);
        }

        if ($this->has('filters_json')) {
            $filtersJson = $this->input('filters_json', '{}');
            $filters = json_decode($filtersJson, true);
            return is_array($filters) ? $filters : [];
        }

        if ($this->has('saved_filter_id')) {
            $savedFilterId = $this->input('saved_filter_id');
            $savedFilter = \App\Models\SavedFilter::find($savedFilterId);
            
            if ($savedFilter) {
                $filterDefinition = $savedFilter->filter_definition;
                return is_array($filterDefinition) ? $filterDefinition : [];
            }
        }

        return [];
    }

    /**
     * Get filter saving parameters
     *
     * @return array
     */
    public function getFilterSaveParams(): array
    {
        return [
            'save_filter' => $this->input('save_filter', false),
            'filter_name' => $this->input('filter_name'),
            'is_public' => $this->input('is_public', false),
        ];
    }

    /**
     * Check if user wants to save the current filter
     *
     * @return bool
     */
    public function shouldSaveFilter(): bool
    {
        return $this->input('save_filter', false);
    }

    /**
     * Get the board ID from the route
     *
     * @return int|null
     */
    public function getBoardId(): ?int
    {
        return $this->route('board');
    }

    /**
     * Get the workspace ID from the route
     *
     * @return int|null
     */
    public function getWorkspaceId(): ?int
    {
        return $this->route('workspace');
    }

    /**
     * Get the tenant ID from the route
     *
     * @return int|null
     */
    public function getTenantId(): ?int
    {
        return $this->route('tenant');
    }

    /**
     * Get all request parameters as an array
     *
     * @return array
     */
    public function getAllParams(): array
    {
        return [
            'filters' => $this->getFilters(),
            'pagination' => [
                'per_page' => $this->input('per_page', 15),
                'page' => $this->input('page'),
                'cursor' => $this->input('cursor'),
            ],
            'sorting' => [
                'sort_by' => $this->input('sort_by', 'position'),
                'sort_order' => $this->input('sort_order', 'asc'),
            ],
            'include' => $this->input('include', []),
            'save_params' => $this->getFilterSaveParams(),
            'search' => $this->input('search'),
            'status' => $this->input('status'),
            'priority' => $this->input('priority'),
            'assignee_id' => $this->input('assignee_id'),
            'creator_id' => $this->input('creator_id'),
            'due_date_from' => $this->input('due_date_from'),
            'due_date_to' => $this->input('due_date_to'),
            'start_date_from' => $this->input('start_date_from'),
            'start_date_to' => $this->input('start_date_to'),
            'created_at_from' => $this->input('created_at_from'),
            'created_at_to' => $this->input('created_at_to'),
            'labels' => $this->input('labels'),
            'include_archived' => $this->input('include_archived', false),
        ];
    }
}