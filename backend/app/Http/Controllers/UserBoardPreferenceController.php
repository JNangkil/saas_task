<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserBoardPreferenceResource;
use App\Models\Board;
use App\Models\UserBoardPreference;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class UserBoardPreferenceController extends Controller
{
    /**
     * Display the user's preferences for a board.
     *
     * @param Board $board
     * @return UserBoardPreferenceResource
     */
    public function index(Board $board): UserBoardPreferenceResource
    {
        $this->authorize('view', $board);

        $user = Auth::user();
        
        $preference = UserBoardPreference::firstOrCreate(
            [
                'user_id' => $user->id,
                'board_id' => $board->id,
            ],
            [
                'column_preferences' => [],
            ]
        );

        return new UserBoardPreferenceResource($preference);
    }

    /**
     * Update the user's preferences for a board.
     *
     * @param Request $request
     * @param Board $board
     * @return UserBoardPreferenceResource
     */
    public function update(Request $request, Board $board): UserBoardPreferenceResource
    {
        $this->authorize('view', $board);

        $request->validate([
            'column_preferences' => 'sometimes|array',
            'column_preferences.*.visible' => 'sometimes|boolean',
            'column_preferences.*.width' => 'sometimes|nullable|numeric|min:50|max:500',
            'column_preferences.*.position' => 'sometimes|nullable|integer|min:0',
        ]);

        $user = Auth::user();
        
        $preference = UserBoardPreference::firstOrCreate(
            [
                'user_id' => $user->id,
                'board_id' => $board->id,
            ],
            [
                'column_preferences' => [],
            ]
        );

        // Update column preferences
        if ($request->has('column_preferences')) {
            $newPreferences = $request->input('column_preferences', []);
            $currentPreferences = $preference->column_preferences ?? [];

            // Merge new preferences with existing ones
            foreach ($newPreferences as $columnId => $columnPreference) {
                if (!isset($currentPreferences[$columnId])) {
                    $currentPreferences[$columnId] = [
                        'visible' => true,
                        'width' => null,
                        'position' => null,
                    ];
                }

                // Update only the provided fields
                if (isset($columnPreference['visible'])) {
                    $currentPreferences[$columnId]['visible'] = $columnPreference['visible'];
                }
                if (isset($columnPreference['width'])) {
                    $currentPreferences[$columnId]['width'] = $columnPreference['width'];
                }
                if (isset($columnPreference['position'])) {
                    $currentPreferences[$columnId]['position'] = $columnPreference['position'];
                }
            }

            $preference->column_preferences = $currentPreferences;
            $preference->save();
        }

        return new UserBoardPreferenceResource($preference);
    }

    /**
     * Reset user's preferences for a board to defaults.
     *
     * @param Board $board
     * @return JsonResponse
     */
    public function reset(Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        $user = Auth::user();
        
        $preference = UserBoardPreference::where('user_id', $user->id)
            ->where('board_id', $board->id)
            ->first();

        if ($preference) {
            $preference->resetToDefaults();
        }

        return response()->json(['message' => 'Preferences reset to defaults']);
    }

    /**
     * Update visibility for multiple columns at once.
     *
     * @param Request $request
     * @param Board $board
     * @return JsonResponse
     */
    public function updateVisibility(Request $request, Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        $request->validate([
            'columns' => 'required|array|min:1',
            'columns.*.id' => 'required|integer|exists:board_columns,id',
            'columns.*.visible' => 'required|boolean',
        ]);

        $user = Auth::user();
        
        $preference = UserBoardPreference::firstOrCreate(
            [
                'user_id' => $user->id,
                'board_id' => $board->id,
            ],
            [
                'column_preferences' => [],
            ]
        );

        $columns = $request->input('columns', []);
        $currentPreferences = $preference->column_preferences ?? [];

        foreach ($columns as $column) {
            $columnId = $column['id'];
            $visible = $column['visible'];

            if (!isset($currentPreferences[$columnId])) {
                $currentPreferences[$columnId] = [
                    'visible' => true,
                    'width' => null,
                    'position' => null,
                ];
            }

            $currentPreferences[$columnId]['visible'] = $visible;
        }

        $preference->column_preferences = $currentPreferences;
        $preference->save();

        return response()->json(['message' => 'Column visibility updated successfully']);
    }

    /**
     * Update width for multiple columns at once.
     *
     * @param Request $request
     * @param Board $board
     * @return JsonResponse
     */
    public function updateWidths(Request $request, Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        $request->validate([
            'columns' => 'required|array|min:1',
            'columns.*.id' => 'required|integer|exists:board_columns,id',
            'columns.*.width' => 'required|nullable|numeric|min:50|max:500',
        ]);

        $user = Auth::user();
        
        $preference = UserBoardPreference::firstOrCreate(
            [
                'user_id' => $user->id,
                'board_id' => $board->id,
            ],
            [
                'column_preferences' => [],
            ]
        );

        $columns = $request->input('columns', []);
        $currentPreferences = $preference->column_preferences ?? [];

        foreach ($columns as $column) {
            $columnId = $column['id'];
            $width = $column['width'];

            if (!isset($currentPreferences[$columnId])) {
                $currentPreferences[$columnId] = [
                    'visible' => true,
                    'width' => null,
                    'position' => null,
                ];
            }

            $currentPreferences[$columnId]['width'] = $width;
        }

        $preference->column_preferences = $currentPreferences;
        $preference->save();

        return response()->json(['message' => 'Column widths updated successfully']);
    }

    /**
     * Update positions for multiple columns at once.
     *
     * @param Request $request
     * @param Board $board
     * @return JsonResponse
     */
    public function updatePositions(Request $request, Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        $request->validate([
            'columns' => 'required|array|min:1',
            'columns.*.id' => 'required|integer|exists:board_columns,id',
            'columns.*.position' => 'required|integer|min:0',
        ]);

        $user = Auth::user();
        
        $preference = UserBoardPreference::firstOrCreate(
            [
                'user_id' => $user->id,
                'board_id' => $board->id,
            ],
            [
                'column_preferences' => [],
            ]
        );

        $columns = $request->input('columns', []);
        $currentPreferences = $preference->column_preferences ?? [];

        foreach ($columns as $column) {
            $columnId = $column['id'];
            $position = $column['position'];

            if (!isset($currentPreferences[$columnId])) {
                $currentPreferences[$columnId] = [
                    'visible' => true,
                    'width' => null,
                    'position' => null,
                ];
            }

            $currentPreferences[$columnId]['position'] = $position;
        }

        $preference->column_preferences = $currentPreferences;
        $preference->save();

        return response()->json(['message' => 'Column positions updated successfully']);
    }

    /**
     * Get all visible columns for the user on a board.
     *
     * @param Board $board
     * @return JsonResponse
     */
    public function getVisibleColumns(Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        $user = Auth::user();
        
        $preference = UserBoardPreference::where('user_id', $user->id)
            ->where('board_id', $board->id)
            ->first();

        if (!$preference) {
            // Return all board columns if no preferences exist
            $columns = $board->columns()->ordered()->get();
            return response()->json($columns);
        }

        $visibleColumns = $preference->applyToColumns($board->columns()->ordered()->get());

        return response()->json($visibleColumns);
    }

    /**
     * Get all hidden columns for the user on a board.
     *
     * @param Board $board
     * @return JsonResponse
     */
    public function getHiddenColumns(Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        $user = Auth::user();
        
        $preference = UserBoardPreference::where('user_id', $user->id)
            ->where('board_id', $board->id)
            ->first();

        if (!$preference) {
            return response()->json([]);
        }

        $hiddenColumnIds = $preference->getHiddenColumns();
        $hiddenColumns = $board->columns()
            ->whereIn('id', $hiddenColumnIds)
            ->ordered()
            ->get();

        return response()->json($hiddenColumns);
    }

    /**
     * Reset preference for a specific column.
     *
     * @param Request $request
     * @param Board $board
     * @return JsonResponse
     */
    public function resetColumn(Request $request, Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        $request->validate([
            'column_id' => 'required|integer|exists:board_columns,id',
        ]);

        $user = Auth::user();
        $columnId = $request->input('column_id');
        
        $preference = UserBoardPreference::where('user_id', $user->id)
            ->where('board_id', $board->id)
            ->first();

        if ($preference) {
            $preference->resetColumnPreference($columnId);
        }

        return response()->json(['message' => 'Column preference reset successfully']);
    }
}