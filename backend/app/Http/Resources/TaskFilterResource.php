<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskFilterResource extends JsonResource
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
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'assignee' => $this->when($this->assignee, function () {
                return [
                    'id' => $this->assignee->id,
                    'name' => $this->assignee->name,
                    'email' => $this->assignee->email,
                    'avatar' => $this->assignee->avatar,
                ];
            }),
            'creator' => $this->when($this->creator, function () {
                return [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                    'email' => $this->creator->email,
                    'avatar' => $this->creator->avatar,
                ];
            }),
            'board' => $this->when($this->board, function () {
                return [
                    'id' => $this->board->id,
                    'name' => $this->board->name,
                ];
            }),
            'workspace' => $this->when($this->workspace, function () {
                return [
                    'id' => $this->workspace->id,
                    'name' => $this->workspace->name,
                ];
            }),
            'labels' => $this->when($this->labels, function () {
                return $this->labels->map(function ($label) {
                    return [
                        'id' => $label->id,
                        'name' => $label->name,
                        'color' => $label->color,
                    ];
                });
            }),
            'custom_values' => $this->when($this->customValues, function () {
                return $this->customValues->map(function ($customValue) {
                    return [
                        'id' => $customValue->id,
                        'field_name' => $customValue->field_name,
                        'field_type' => $customValue->field_type,
                        'value' => $customValue->value,
                        'display_value' => $customValue->getDisplayValue(),
                    ];
                });
            }),
            'due_date' => $this->due_date,
            'start_date' => $this->start_date,
            'completed_at' => $this->completed_at,
            'archived_at' => $this->archived_at,
            'position' => $this->position,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }

    /**
     * Create a new resource instance for filtering results
     *
     * @param mixed $resource
     * @return static
     */
    public static function collectionForFiltering($resource)
    {
        return new static($resource);
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
                'filtered' => true,
                'filter_applied' => $request->input('filters') ? true : false,
                'filter_count' => $request->input('filters') ? count($request->input('filters')) : 0,
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
                'filtered' => true,
                'filter_applied' => $request->input('filters') ? true : false,
                'filter_count' => $request->input('filters') ? count($request->input('filters')) : 0,
            ],
        ];
    }

    /**
     * Customize the response for cursor pagination
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function withCursorPagination($request)
    {
        return [
            'data' => $this->collection,
            'links' => [
                'first' => $this->url(null),
                'prev' => $this->previousPageUrl(),
                'next' => $this->nextPageUrl(),
            ],
            'meta' => [
                'path' => $request->url(),
                'per_page' => $this->perPage(),
                'next_cursor' => $this->nextCursor()?->encode(),
                'prev_cursor' => $this->previousCursor()?->encode(),
                'filtered' => true,
                'filter_applied' => $request->input('filters') ? true : false,
                'filter_count' => $request->input('filters') ? count($request->input('filters')) : 0,
            ],
        ];
    }

    /**
     * Get filter summary for display
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function getFilterSummary($request)
    {
        $filters = $request->input('filters', []);
        $filterBuilder = app(\App\Services\FilterBuilder::class);
        
        $summaries = [];
        foreach ($filters as $filter) {
            if ($filter['type'] === 'group') {
                $summaries[] = $filterBuilder->getFilterGroupSummary($filter);
            } else {
                $summaries[] = $filterBuilder->getFilterSummary($filter);
            }
        }

        return [
            'filters' => $filters,
            'summaries' => $summaries,
            'count' => count($filters),
            'has_filters' => !empty($filters),
        ];
    }

    /**
     * Get filter statistics
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Board  $board
     * @return array<string, mixed>
     */
    public function getFilterStatistics($request, $board)
    {
        $filterService = app(\App\Services\TaskFilterService::class);
        $filters = $request->input('filters', []);
        
        return $filterService->getFilterStatistics($board, $filters);
    }

    /**
     * Get available filter columns
     *
     * @param  \App\Models\Board  $board
     * @return array<string, mixed>
     */
    public function getAvailableFilterColumns($board)
    {
        $filterService = app(\App\Services\TaskFilterService::class);
        return $filterService->getAvailableFilterColumns($board);
    }

    /**
     * Get filter validation errors
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function getFilterValidationErrors($request)
    {
        $filterBuilder = app(\App\Services\FilterBuilder::class);
        $filters = $request->input('filters', []);
        
        $errors = [];
        foreach ($filters as $index => $filter) {
            try {
                if ($filter['type'] === 'group') {
                    $filterBuilder->validateFilterGroup($filter);
                } else {
                    $filterBuilder->buildFilter($filter);
                }
            } catch (\Illuminate\Validation\ValidationException $e) {
                $errors["filters.{$index}"] = $e->errors();
            }
        }

        return $errors;
    }

    /**
     * Get filter combination validation
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array<string, mixed>
     */
    public function getFilterCombinationValidation($request)
    {
        $filterService = app(\App\Services\TaskFilterService::class);
        $filters = $request->input('filters', []);
        
        return $filterService->validateFilterCombinations($filters);
    }
}