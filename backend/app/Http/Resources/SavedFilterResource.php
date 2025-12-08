<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SavedFilterResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'filter_definition' => $this->filter_definition,
            'filter_definition_json' => $this->getFilterDefinitionJson(),
            'summary' => $this->getSummary(),
            'is_public' => $this->is_public,
            'is_default' => $this->is_default,
            'usage_count' => $this->usage_count,
            'last_used_at' => $this->last_used_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'user' => $this->when($this->user, function () {
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                    'avatar' => $this->user->avatar,
                ];
            }),
            'board' => $this->when($this->board, function () {
                return [
                    'id' => $this->board->id,
                    'name' => $this->board->name,
                ];
            }),
            'statistics' => $this->getStatistics(),
            'can_edit' => $this->canEdit($request->user()),
            'can_delete' => $this->canDelete($request->user()),
            'can_share' => $this->canShare($request->user()),
            'is_accessible' => $this->isAccessibleBy($request->user()),
        ];
    }

    /**
     * Check if the current user can edit the saved filter
     *
     * @param  \App\Models\User|null  $user
     * @return bool
     */
    protected function canEdit($user): bool
    {
        if (!$user) {
            return false;
        }

        return $this->user_id === $user->id;
    }

    /**
     * Check if the current user can delete the saved filter
     *
     * @param  \App\Models\User|null  $user
     * @return bool
     */
    protected function canDelete($user): bool
    {
        if (!$user) {
            return false;
        }

        return $this->user_id === $user->id;
    }

    /**
     * Check if the current user can share the saved filter
     *
     * @param  \App\Models\User|null  $user
     * @return bool
     */
    protected function canShare($user): bool
    {
        if (!$user) {
            return false;
        }

        return $this->user_id === $user->id;
    }

    /**
     * Create a new resource instance for collection
     *
     * @param  \Illuminate\Support\Collection  $collection
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection
     */
    public static function collection($collection)
    {
        return parent::collection($collection);
    }

    /**
     * Get additional data that should be returned with the resource.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function with($request)
    {
        return [
            'meta' => [
                'can_create' => true,
                'can_share' => $this->canShare($request->user()),
                'max_filters_per_user' => 50, // Configurable limit
            ],
        ];
    }

    /**
     * Customize the response for pagination
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function withPagination($request)
    {
        return [
            'data' => $this->collection,
            'links' => [
                'first' => $this->url(1),
                'last' => $this->url($this->lastPage()),
                'prev' => $this->previousPageUrl(),
                'next' => $this->nextPageUrl(),
            ],
            'meta' => [
                'current_page' => $this->currentPage(),
                'from' => $this->firstItem(),
                'last_page' => $this->lastPage(),
                'per_page' => $this->perPage(),
                'to' => $this->lastItem(),
                'total' => $this->total(),
                'can_create' => true,
                'can_share' => $this->canShare($request->user()),
                'max_filters_per_user' => 50,
            ],
        ];
    }

    /**
     * Get filter summary for display in lists
     *
     * @return array<string, mixed>
     */
    public function getFilterSummary()
    {
        $filterDefinition = $this->filter_definition;
        
        if (empty($filterDefinition)) {
            return [
                'text' => 'No filters applied',
                'count' => 0,
                'type' => 'empty',
            ];
        }

        $filterCount = is_array($filterDefinition) ? count($filterDefinition) : 0;
        
        return [
            'text' => "{$filterCount} filter" . ($filterCount !== 1 ? 's' : ''),
            'count' => $filterCount,
            'type' => $filterCount > 0 ? 'filtered' : 'empty',
        ];
    }

    /**
     * Get filter preview for quick display
     *
     * @return array<string, mixed>
     */
    public function getFilterPreview()
    {
        $filterDefinition = $this->filter_definition;
        
        if (empty($filterDefinition)) {
            return [
                'text' => 'No filters',
                'filters' => [],
            ];
        }

        $filterBuilder = app(\App\Services\FilterBuilder::class);
        $previews = [];
        
        foreach ($filterDefinition as $filter) {
            if ($filter['type'] === 'group') {
                $previews[] = [
                    'type' => 'group',
                    'text' => $filterBuilder->getFilterGroupSummary($filter),
                    'count' => count($filter['filters'] ?? []),
                ];
            } else {
                $previews[] = [
                    'type' => 'filter',
                    'text' => $filterBuilder->getFilterSummary($filter),
                    'column' => $filter['column'] ?? '',
                    'operator' => $filter['operator'] ?? '',
                ];
            }
        }

        return [
            'text' => $this->getSummary(),
            'filters' => $previews,
        ];
    }

    /**
     * Get sharing information
     *
     * @return array<string, mixed>
     */
    public function getSharingInfo()
    {
        return [
            'is_public' => $this->is_public,
            'is_default' => $this->is_default,
            'shares_count' => $this->shares()->count(),
            'can_be_shared' => !$this->is_public,
            'sharing_url' => $this->is_public ? route('filters.public', $this->id) : null,
        ];
    }

    /**
     * Get usage statistics
     *
     * @return array<string, mixed>
     */
    public function getUsageStatistics()
    {
        return [
            'usage_count' => $this->usage_count,
            'last_used_at' => $this->last_used_at,
            'days_since_creation' => $this->created_at->diffInDays(now()),
            'days_since_last_use' => $this->last_used_at ? $this->last_used_at->diffInDays(now()) : null,
            'usage_frequency' => $this->calculateUsageFrequency(),
        ];
    }

    /**
     * Calculate usage frequency
     *
     * @return string
     */
    protected function calculateUsageFrequency(): string
    {
        if ($this->usage_count === 0) {
            return 'never';
        }

        $daysSinceCreation = $this->created_at->diffInDays(now());
        if ($daysSinceCreation === 0) {
            return 'daily';
        }

        $usagePerDay = $this->usage_count / $daysSinceCreation;
        
        if ($usagePerDay >= 1) {
            return 'daily';
        } elseif ($usagePerDay >= 0.5) {
            return 'weekly';
        } elseif ($usagePerDay >= 0.14) { // ~1 per week
            return 'monthly';
        } else {
            return 'rarely';
        }
    }

    /**
     * Get validation rules for the filter
     *
     * @return array<string, mixed>
     */
    public function getValidationRules()
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                'unique:saved_filters,name,' . $this->id . ',id,user_id,' . $this->user_id,
            ],
            'description' => [
                'nullable',
                'string',
                'max:1000',
            ],
            'filter_definition' => [
                'required',
                'array',
            ],
            'is_public' => [
                'boolean',
            ],
            'is_default' => [
                'boolean',
            ],
        ];
    }

    /**
     * Get validation messages for the filter
     *
     * @return array<string, string>
     */
    public function getValidationMessages()
    {
        return [
            'name.required' => 'Filter name is required',
            'name.string' => 'Filter name must be a string',
            'name.max' => 'Filter name may not be greater than 255 characters',
            'name.unique' => 'Filter name must be unique for this user',
            'description.string' => 'Description must be a string',
            'description.max' => 'Description may not be greater than 1000 characters',
            'filter_definition.required' => 'Filter definition is required',
            'filter_definition.array' => 'Filter definition must be an array',
            'is_public.boolean' => 'Is public must be a boolean',
            'is_default.boolean' => 'Is default must be a boolean',
        ];
    }
}