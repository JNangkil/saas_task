<?php

namespace App\Http\Resources;

use App\Http\Resources\TaskResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Task Bulk Operation Result Resource
 * 
 * This resource represents the result of a bulk operation
 * that has been processed synchronously.
 */
class TaskBulkOperationResultResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = [
            'operation' => $this->resource['operation'],
            'successful_count' => $this->resource['successful_count'],
            'failed_count' => $this->resource['failed_count'],
            'total_count' => $this->resource['successful_count'] + $this->resource['failed_count'],
            'success_rate' => $this->calculateSuccessRate(),
            'processed_at' => now()->toISOString(),
        ];

        // Include operation-specific data
        if (isset($this->resource['target_board_id'])) {
            $data['target_board_id'] = $this->resource['target_board_id'];
        }
        if (isset($this->resource['assignee_id'])) {
            $data['assignee_id'] = $this->resource['assignee_id'];
        }
        if (isset($this->resource['status'])) {
            $data['status'] = $this->resource['status'];
        }
        if (isset($this->resource['priority'])) {
            $data['priority'] = $this->resource['priority'];
        }
        if (isset($this->resource['label_ids'])) {
            $data['label_ids'] = $this->resource['label_ids'];
        }
        if (isset($this->resource['due_date'])) {
            $data['due_date'] = $this->resource['due_date'];
        }

        // Include successful tasks if requested
        if ($request->get('include_successful_tasks', false) && isset($this->resource['successful_tasks'])) {
            $data['successful_tasks'] = TaskResource::collection($this->resource['successful_tasks']);
        }

        // Include failed tasks information
        if (isset($this->resource['failed_tasks'])) {
            $data['failed_tasks'] = $this->resource['failed_tasks']->map(function ($failedTask) {
                if (is_array($failedTask)) {
                    return [
                        'task_id' => $failedTask['task_id'],
                        'error' => $failedTask['error'],
                    ];
                }
                return [
                    'task_id' => $failedTask->id,
                    'error' => 'Unknown error occurred',
                ];
            });
        }

        return $data;
    }

    /**
     * Calculate the success rate as a percentage.
     */
    protected function calculateSuccessRate(): float
    {
        $total = $this->resource['successful_count'] + $this->resource['failed_count'];
        
        if ($total === 0) {
            return 0.0;
        }

        return round(($this->resource['successful_count'] / $total) * 100, 2);
    }
}