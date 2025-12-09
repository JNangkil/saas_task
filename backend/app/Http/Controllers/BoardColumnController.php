<?php

namespace App\Http\Controllers;

use App\Http\Requests\BoardColumnRequest;
use App\Http\Requests\ColumnReorderRequest;
use App\Http\Resources\BoardColumnResource;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Enums\ColumnType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Events\ColumnCreated;
use App\Events\ColumnUpdated;
use App\Events\ColumnDeleted;
use App\Events\ColumnsReordered;

class BoardColumnController extends Controller
{
    /**
     * Display a listing of columns for a board.
     *
     * @param Board $board
     * @return AnonymousResourceCollection
     */
    public function index(Board $board): AnonymousResourceCollection
    {
        $this->authorize('view', $board);

        $columns = $board->columns()
            ->ordered()
            ->get();

        return BoardColumnResource::collection($columns);
    }

    /**
     * Store a newly created column in storage.
     *
     * @param BoardColumnRequest $request
     * @param Board $board
     * @return BoardColumnResource
     */
    public function store(BoardColumnRequest $request, Board $board): BoardColumnResource
    {
        $this->authorize('update', $board);

        $validated = $request->getValidatedData();

        // Set the board ID
        $validated['board_id'] = $board->id;

        // Calculate position if not provided
        if (!isset($validated['position'])) {
            $maxPosition = $board->columns()->max('position') ?? 0;
            $validated['position'] = $maxPosition + 1;
        }

        $column = BoardColumn::create($validated);
        
        broadcast(new ColumnCreated($column))->toOthers();

        return new BoardColumnResource($column);
    }

    /**
     * Display the specified column.
     *
     * @param Board $board
     * @param BoardColumn $column
     * @return BoardColumnResource
     */
    public function show(Board $board, BoardColumn $column): BoardColumnResource
    {
        $this->authorize('view', $board);

        // Ensure the column belongs to the board
        if ($column->board_id !== $board->id) {
            return response()->json(['error' => 'Column does not belong to this board'], 403);
        }

        return new BoardColumnResource($column);
    }

    /**
     * Update the specified column in storage.
     *
     * @param BoardColumnRequest $request
     * @param Board $board
     * @param BoardColumn $column
     * @return BoardColumnResource
     */
    public function update(BoardColumnRequest $request, Board $board, BoardColumn $column): BoardColumnResource
    {
        $this->authorize('update', $board);

        // Ensure the column belongs to the board
        if ($column->board_id !== $board->id) {
            return response()->json(['error' => 'Column does not belong to this board'], 403);
        }

        $validated = $request->getValidatedData();

        $column->update($validated);
        
        broadcast(new ColumnUpdated($column))->toOthers();

        return new BoardColumnResource($column);
    }

    /**
     * Remove the specified column from storage.
     *
     * @param Board $board
     * @param BoardColumn $column
     * @return JsonResponse
     */
    public function destroy(Board $board, BoardColumn $column): JsonResponse
    {
        $this->authorize('update', $board);

        // Ensure the column belongs to the board
        if ($column->board_id !== $board->id) {
            return response()->json(['error' => 'Column does not belong to this board'], 403);
        }

        // Check if column is required
        if ($column->is_required) {
            return response()->json(['error' => 'Cannot delete a required column'], 422);
        }

        // Delete all field values for this column
        $column->taskFieldValues()->delete();

        // Delete the column
        $columnId = $column->id;
        $boardId = $board->id;
        $column->delete();
        
        broadcast(new ColumnDeleted($columnId, $boardId))->toOthers();

        return response()->json(null, 204);
    }

    /**
     * Reorder columns for a board.
     *
     * @param ColumnReorderRequest $request
     * @param Board $board
     * @return JsonResponse
     */
    public function reorder(ColumnReorderRequest $request, Board $board): JsonResponse
    {
        $this->authorize('update', $board);

        $reorderData = $request->getReorderData();

        DB::transaction(function () use ($reorderData) {
            foreach ($reorderData as $columnData) {
                BoardColumn::where('id', $columnData['id'])
                    ->update(['position' => $columnData['order']]);
            }
        });

        broadcast(new ColumnsReordered($board->id, $reorderData))->toOthers();

        return response()->json(['message' => 'Columns reordered successfully']);
    }

    /**
     * Get all available column types.
     *
     * @return JsonResponse
     */
    public function getTypes(): JsonResponse
    {
        $types = [];

        foreach (ColumnType::cases() as $type) {
            $types[] = [
                'value' => $type->value,
                'label' => $type->getLabel(),
                'icon' => $type->getIcon(),
                'default_options' => $type->getDefaultOptions(),
                'validation_rules' => $type->getValidationRules(),
                'filter_operators' => $type->getFilterOperators(),
                'frontend_component' => $type->getFrontendComponent(),
                'supports_multiple_values' => $type->supportsMultipleValues(),
                'database_cast' => $type->getDatabaseCast(),
                'json_schema' => $type->getJsonSchema(),
            ];
        }

        return response()->json($types);
    }

    /**
     * Duplicate a column.
     *
     * @param Board $board
     * @param BoardColumn $column
     * @return BoardColumnResource
     */
    public function duplicate(Board $board, BoardColumn $column): BoardColumnResource
    {
        $this->authorize('update', $board);

        // Ensure the column belongs to the board
        if ($column->board_id !== $board->id) {
            return response()->json(['error' => 'Column does not belong to this board'], 403);
        }

        // Calculate new position
        $maxPosition = $board->columns()->max('position') ?? 0;
        $newPosition = $maxPosition + 1;

        // Create duplicate
        $newColumn = $column->replicate();
        $newColumn->name = $column->name . ' (Copy)';
        $newColumn->position = $newPosition;
        $newColumn->is_required = false; // Make duplicate non-required
        $newColumn->save();
        
        broadcast(new ColumnCreated($newColumn))->toOthers();

        return new BoardColumnResource($newColumn);
    }

    /**
     * Toggle column pinned status.
     *
     * @param Board $board
     * @param BoardColumn $column
     * @return BoardColumnResource
     */
    public function togglePin(Board $board, BoardColumn $column): BoardColumnResource
    {
        $this->authorize('update', $board);

        // Ensure the column belongs to the board
        if ($column->board_id !== $board->id) {
            return response()->json(['error' => 'Column does not belong to this board'], 403);
        }

        $column->is_pinned = !$column->is_pinned;
        $column->save();
        
        broadcast(new ColumnUpdated($column))->toOthers();

        return new BoardColumnResource($column);
    }

    /**
     * Toggle column required status.
     *
     * @param Board $board
     * @param BoardColumn $column
     * @return BoardColumnResource
     */
    public function toggleRequired(Board $board, BoardColumn $column): BoardColumnResource
    {
        $this->authorize('update', $board);

        // Ensure the column belongs to the board
        if ($column->board_id !== $board->id) {
            return response()->json(['error' => 'Column does not belong to this board'], 403);
        }

        // Don't allow unchecking required for system columns
        if ($column->is_required && in_array($column->type, ['text', 'status'])) {
            return response()->json(['error' => 'Cannot make this column optional'], 422);
        }

        $column->is_required = !$column->is_required;
        $column->save();
        
        broadcast(new ColumnUpdated($column))->toOthers();

        return new BoardColumnResource($column);
    }

    /**
     * Get column statistics.
     *
     * @param Board $board
     * @param BoardColumn $column
     * @return JsonResponse
     */
    public function getStatistics(Board $board, BoardColumn $column): JsonResponse
    {
        $this->authorize('view', $board);

        // Ensure the column belongs to the board
        if ($column->board_id !== $board->id) {
            return response()->json(['error' => 'Column does not belong to this board'], 403);
        }

        $totalTasks = $board->tasks()->count();
        $filledTasks = $column->taskFieldValues()
            ->whereNotNull('value')
            ->where('value', '!=', '')
            ->count();

        $statistics = [
            'total_tasks' => $totalTasks,
            'filled_tasks' => $filledTasks,
            'empty_tasks' => $totalTasks - $filledTasks,
            'completion_rate' => $totalTasks > 0 ? round(($filledTasks / $totalTasks) * 100, 2) : 0,
        ];

        // Add type-specific statistics
        if ($column->type === 'status' || $column->type === 'priority') {
            $valueCounts = $column->taskFieldValues()
                ->selectRaw('value, COUNT(*) as count')
                ->whereNotNull('value')
                ->where('value', '!=', '')
                ->groupBy('value')
                ->pluck('count', 'value')
                ->toArray();

            $statistics['value_distribution'] = $valueCounts;
        }

        return response()->json($statistics);
    }
}