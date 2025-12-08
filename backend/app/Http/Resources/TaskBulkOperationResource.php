<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Task Bulk Operation Resource
 * 
 * This resource represents a bulk operation response for
 * operations that are queued for async processing.
 */
class TaskBulkOperationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'message' => $this->resource['message'],
            'job_id' => $this->resource['job_id'] ?? null,
            'task_count' => $this->resource['task_count'] ?? 0,
            'operation_type' => $this->resource['operation_type'] ?? null,
            'estimated_completion_time' => $this->resource['estimated_completion_time'] ?? null,
            'status_url' => $this->resource['status_url'] ?? null,
        ];
    }
}