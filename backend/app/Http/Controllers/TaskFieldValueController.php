<?php

namespace App\Http\Controllers;

use App\Http\Requests\TaskFieldValueRequest;
use App\Http\Resources\TaskFieldValueResource;
use App\Models\Task;
use App\Models\TaskFieldValue;
use App\Models\BoardColumn;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class TaskFieldValueController extends Controller
{
    /**
     * Display a listing of field values for a task.
     *
     * @param Task $task
     * @return AnonymousResourceCollection
     */
    public function index(Task $task): AnonymousResourceCollection
    {
        $this->authorize('view', $task);

        $fieldValues = $task->fieldValues()
            ->with('boardColumn')
            ->get();

        return TaskFieldValueResource::collection($fieldValues);
    }

    /**
     * Store or update field values for a task.
     *
     * @param TaskFieldValueRequest $request
     * @param Task $task
     * @return AnonymousResourceCollection
     */
    public function store(TaskFieldValueRequest $request, Task $task): AnonymousResourceCollection
    {
        $this->authorize('update', $task);

        $validatedValues = $request->getValidatedValues();
        $createdFieldValues = [];

        DB::transaction(function () use ($task, $validatedValues, &$createdFieldValues) {
            foreach ($validatedValues as $valueData) {
                $fieldValue = TaskFieldValue::updateOrCreate(
                    [
                        'task_id' => $task->id,
                        'board_column_id' => $valueData['column_id'],
                    ],
                    [
                        'value' => $valueData['value'],
                    ]
                );

                $createdFieldValues[] = $fieldValue;
            }
        });

        // Reload with relationships
        $fieldValues = TaskFieldValue::whereIn('id', collect($createdFieldValues)->pluck('id'))
            ->with('boardColumn')
            ->get();

        return TaskFieldValueResource::collection($fieldValues);
    }

    /**
     * Display the specified field value.
     *
     * @param Task $task
     * @param TaskFieldValue $fieldValue
     * @return TaskFieldValueResource
     */
    public function show(Task $task, TaskFieldValue $fieldValue): TaskFieldValueResource
    {
        $this->authorize('view', $task);

        // Ensure the field value belongs to the task
        if ($fieldValue->task_id !== $task->id) {
            return response()->json(['error' => 'Field value does not belong to this task'], 403);
        }

        $fieldValue->load('boardColumn');

        return new TaskFieldValueResource($fieldValue);
    }

    /**
     * Update the specified field value in storage.
     *
     * @param TaskFieldValueRequest $request
     * @param Task $task
     * @param TaskFieldValue $fieldValue
     * @return TaskFieldValueResource
     */
    public function update(TaskFieldValueRequest $request, Task $task, TaskFieldValue $fieldValue): TaskFieldValueResource
    {
        $this->authorize('update', $task);

        // Ensure the field value belongs to the task
        if ($fieldValue->task_id !== $task->id) {
            return response()->json(['error' => 'Field value does not belong to this task'], 403);
        }

        $validated = $request->validateSingleField();

        $fieldValue->update([
            'value' => $validated['value'],
        ]);

        $fieldValue->load('boardColumn');

        return new TaskFieldValueResource($fieldValue);
    }

    /**
     * Remove the specified field value from storage.
     *
     * @param Task $task
     * @param TaskFieldValue $fieldValue
     * @return JsonResponse
     */
    public function destroy(Task $task, TaskFieldValue $fieldValue): JsonResponse
    {
        $this->authorize('update', $task);

        // Ensure the field value belongs to the task
        if ($fieldValue->task_id !== $task->id) {
            return response()->json(['error' => 'Field value does not belong to this task'], 403);
        }

        // Check if the column is required
        $column = $fieldValue->boardColumn;
        if ($column && $column->is_required) {
            return response()->json(['error' => 'Cannot delete a value for a required column'], 422);
        }

        $fieldValue->delete();

        return response()->json(null, 204);
    }

    /**
     * Bulk update field values for multiple tasks.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'task_ids' => 'required|array|min:1',
            'task_ids.*' => 'required|integer|exists:tasks,id',
            'column_id' => 'required|integer|exists:board_columns,id',
            'value' => 'nullable',
        ]);

        $taskIds = $request->input('task_ids');
        $columnId = $request->input('column_id');
        $value = $request->input('value');

        // Get the column to validate the value
        $column = BoardColumn::findOrFail($columnId);

        // Validate the value against the column type
        try {
            $validatedValue = \App\Services\ColumnTypeValidator::validateFieldValue(
                $column->type,
                $value,
                $column->options ?? []
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['errors' => $e->errors()], 422);
        }

        // Check authorization for all tasks
        $tasks = Task::whereIn('id', $taskIds)->get();
        foreach ($tasks as $task) {
            $this->authorize('update', $task);
        }

        // Update field values
        $updatedCount = 0;
        DB::transaction(function () use ($taskIds, $columnId, $validatedValue, &$updatedCount) {
            foreach ($taskIds as $taskId) {
                $fieldValue = TaskFieldValue::updateOrCreate(
                    [
                        'task_id' => $taskId,
                        'board_column_id' => $columnId,
                    ],
                    [
                        'value' => $validatedValue,
                    ]
                );
                $updatedCount++;
            }
        });

        return response()->json([
            'message' => "Successfully updated {$updatedCount} field values",
            'updated_count' => $updatedCount,
        ]);
    }

    /**
     * Bulk delete field values for multiple tasks.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'task_ids' => 'required|array|min:1',
            'task_ids.*' => 'required|integer|exists:tasks,id',
            'column_id' => 'required|integer|exists:board_columns,id',
        ]);

        $taskIds = $request->input('task_ids');
        $columnId = $request->input('column_id');

        // Get the column
        $column = BoardColumn::findOrFail($columnId);

        // Check if the column is required
        if ($column->is_required) {
            return response()->json(['error' => 'Cannot delete values for a required column'], 422);
        }

        // Check authorization for all tasks
        $tasks = Task::whereIn('id', $taskIds)->get();
        foreach ($tasks as $task) {
            $this->authorize('update', $task);
        }

        // Delete field values
        $deletedCount = TaskFieldValue::whereIn('task_id', $taskIds)
            ->where('board_column_id', $columnId)
            ->delete();

        return response()->json([
            'message' => "Successfully deleted {$deletedCount} field values",
            'deleted_count' => $deletedCount,
        ]);
    }

    /**
     * Get field values for a specific column across multiple tasks.
     *
     * @param Request $request
     * @return AnonymousResourceCollection
     */
    public function getColumnValues(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'task_ids' => 'required|array|min:1',
            'task_ids.*' => 'required|integer|exists:tasks,id',
            'column_id' => 'required|integer|exists:board_columns,id',
        ]);

        $taskIds = $request->input('task_ids');
        $columnId = $request->input('column_id');

        // Check authorization for all tasks
        $tasks = Task::whereIn('id', $taskIds)->get();
        foreach ($tasks as $task) {
            $this->authorize('view', $task);
        }

        $fieldValues = TaskFieldValue::whereIn('task_id', $taskIds)
            ->where('board_column_id', $columnId)
            ->with('boardColumn')
            ->get();

        return TaskFieldValueResource::collection($fieldValues);
    }

    /**
     * Clear all field values for a task.
     *
     * @param Task $task
     * @return JsonResponse
     */
    public function clearAll(Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        // Get all required columns for this task's board
        $requiredColumnIds = $task->board->columns()
            ->where('is_required', true)
            ->pluck('id')
            ->toArray();

        // Delete all field values except for required columns
        $deletedCount = TaskFieldValue::where('task_id', $task->id)
            ->whereNotIn('board_column_id', $requiredColumnIds)
            ->delete();

        return response()->json([
            'message' => "Successfully cleared {$deletedCount} field values",
            'deleted_count' => $deletedCount,
        ]);
    }

    /**
     * Get field value statistics for a board.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $request->validate([
            'board_id' => 'required|integer|exists:boards,id',
            'column_id' => 'nullable|integer|exists:board_columns,id',
        ]);

        $boardId = $request->input('board_id');
        $columnId = $request->input('column_id');

        // Check authorization for the board
        $board = \App\Models\Board::findOrFail($boardId);
        $this->authorize('view', $board);

        $query = TaskFieldValue::join('tasks', 'task_field_values.task_id', '=', 'tasks.id')
            ->join('board_columns', 'task_field_values.board_column_id', '=', 'board_columns.id')
            ->where('tasks.board_id', $boardId);

        if ($columnId) {
            $query->where('task_field_values.board_column_id', $columnId);
        }

        $totalTasks = Task::where('board_id', $boardId)->count();
        $filledFields = $query->whereNotNull('task_field_values.value')
            ->where('task_field_values.value', '!=', '')
            ->count();

        $statistics = [
            'total_tasks' => $totalTasks,
            'total_fields' => $query->count(),
            'filled_fields' => $filledFields,
            'empty_fields' => $totalTasks - $filledFields,
            'completion_rate' => $totalTasks > 0 ? round(($filledFields / $totalTasks) * 100, 2) : 0,
        ];

        // Add column-specific statistics
        if ($columnId) {
            $column = BoardColumn::find($columnId);
            if ($column && in_array($column->type, ['status', 'priority'])) {
                $valueCounts = $query->selectRaw('task_field_values.value, COUNT(*) as count')
                    ->whereNotNull('task_field_values.value')
                    ->where('task_field_values.value', '!=', '')
                    ->groupBy('task_field_values.value')
                    ->pluck('count', 'task_field_values.value')
                    ->toArray();

                $statistics['value_distribution'] = $valueCounts;
            }
        }

        return response()->json($statistics);
    }
}