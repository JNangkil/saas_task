<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class ColumnReorderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'columns' => 'required|array|min:1',
            'columns.*.id' => 'required|integer|exists:board_columns,id',
            'columns.*.order' => 'required|integer|min:1',
        ];
    }

    /**
     * Get custom error messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'columns.required' => 'Columns array is required.',
            'columns.array' => 'Columns must be an array.',
            'columns.min' => 'At least one column must be provided.',
            'columns.*.id.required' => 'Column ID is required.',
            'columns.*.id.integer' => 'Column ID must be an integer.',
            'columns.*.id.exists' => 'One or more columns do not exist.',
            'columns.*.order.required' => 'Column order is required.',
            'columns.*.order.integer' => 'Column order must be an integer.',
            'columns.*.order.min' => 'Column order must be at least 1.',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $this->validateColumnOwnership($validator);
            $this->validateUniqueOrders($validator);
            $this->validateSequentialOrders($validator);
            $this->validateCompleteColumnSet($validator);
        });
    }

    /**
     * Validate that all columns belong to the same board
     */
    protected function validateColumnOwnership($validator): void
    {
        $columns = $this->input('columns', []);
        $boardId = $this->route('board');

        if (!$boardId) {
            return;
        }

        $columnIds = collect($columns)->pluck('id')->unique()->toArray();
        
        $dbColumns = \App\Models\BoardColumn::whereIn('id', $columnIds)->get();
        $boardIds = $dbColumns->pluck('board_id')->unique();

        if ($boardIds->count() > 1 || !$boardIds->contains($boardId)) {
            $validator->errors()->add('columns', 'All columns must belong to the same board.');
        }
    }

    /**
     * Validate that all orders are unique
     */
    protected function validateUniqueOrders($validator): void
    {
        $columns = $this->input('columns', []);
        $orders = collect($columns)->pluck('order');
        $duplicates = $orders->duplicates();

        if ($duplicates->isNotEmpty()) {
            $validator->errors()->add('columns', 'Column orders must be unique. Duplicate orders found: ' . $duplicates->implode(', '));
        }
    }

    /**
     * Validate that orders are sequential (1, 2, 3, ...)
     */
    protected function validateSequentialOrders($validator): void
    {
        $columns = $this->input('columns', []);
        $orders = collect($columns)->pluck('order')->sort()->values();
        $expectedOrders = range(1, $orders->count());

        if ($orders->toArray() !== $expectedOrders) {
            $validator->errors()->add('columns', 'Column orders must be sequential starting from 1.');
        }
    }

    /**
     * Validate that all columns from the board are included in the reorder request
     */
    protected function validateCompleteColumnSet($validator): void
    {
        $columns = $this->input('columns', []);
        $boardId = $this->route('board');

        if (!$boardId) {
            return;
        }

        $requestColumnIds = collect($columns)->pluck('id')->sort()->values();
        $dbColumnIds = \App\Models\BoardColumn::where('board_id', $boardId)
            ->orderBy('order')
            ->pluck('id');

        if ($requestColumnIds->toArray() !== $dbColumnIds->toArray()) {
            $validator->errors()->add('columns', 'All board columns must be included in the reorder request.');
        }
    }

    /**
     * Get validated column reorder data
     */
    public function getReorderData(): array
    {
        $columns = $this->validated()['columns'];
        
        // Sort by order to ensure proper processing
        usort($columns, function ($a, $b) {
            return $a['order'] - $b['order'];
        });

        return $columns;
    }

    /**
     * Get column IDs in their new order
     */
    public function getOrderedColumnIds(): array
    {
        $columns = $this->getReorderData();
        return collect($columns)->pluck('id')->toArray();
    }

    /**
     * Get the board ID from the route
     */
    public function getBoardId(): int
    {
        return (int) $this->route('board');
    }

    /**
     * Validate that the reorder operation won't create conflicts
     */
    public function validateNoConflicts(): bool
    {
        $columns = $this->input('columns', []);
        $boardId = $this->getBoardId();

        // Check if any other reorder operation is in progress for this board
        // This would be useful in a multi-user environment with real-time collaboration
        // For now, we'll just return true as this is a basic implementation
        return true;
    }

    /**
     * Get the current column order from the database
     */
    public function getCurrentOrder(): array
    {
        $boardId = $this->getBoardId();
        
        return \App\Models\BoardColumn::where('board_id', $boardId)
            ->orderBy('order')
            ->pluck('order', 'id')
            ->toArray();
    }

    /**
     * Get the changes that will be made by this reorder operation
     */
    public function getChanges(): array
    {
        $newOrder = $this->getReorderData();
        $currentOrder = $this->getCurrentOrder();
        
        $changes = [];
        
        foreach ($newOrder as $column) {
            $columnId = $column['id'];
            $newOrderValue = $column['order'];
            $currentOrderValue = $currentOrder[$columnId] ?? null;
            
            if ($currentOrderValue !== $newOrderValue) {
                $changes[] = [
                    'column_id' => $columnId,
                    'from_order' => $currentOrderValue,
                    'to_order' => $newOrderValue,
                ];
            }
        }
        
        return $changes;
    }

    /**
     * Check if this is a no-op (no actual changes)
     */
    public function isNoOp(): bool
    {
        $changes = $this->getChanges();
        return empty($changes);
    }

    /**
     * Get summary information for logging/auditing
     */
    public function getAuditSummary(): array
    {
        return [
            'board_id' => $this->getBoardId(),
            'column_count' => count($this->input('columns', [])),
            'changes' => $this->getChanges(),
            'is_no_op' => $this->isNoOp(),
            'user_id' => auth()->id(),
            'timestamp' => now()->toISOString(),
        ];
    }
}