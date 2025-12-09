<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\UserBoardViewPreference;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class BoardViewPreferenceController extends Controller
{
    public function show(Request $request, string $tenant, string $workspace, string $board): JsonResponse
    {
        $boardModel = Board::findOrFail($board);
        
        $preference = UserBoardViewPreference::firstOrCreate(
            [
                'user_id' => Auth::id(),
                'board_id' => $boardModel->id,
            ],
            [
                'preferred_view' => 'table',
                'kanban_config' => [],
                'calendar_config' => [],
                'filters' => [],
            ]
        );

        return response()->json($preference);
    }

    public function update(Request $request, string $tenant, string $workspace, string $board): JsonResponse
    {
        $boardModel = Board::findOrFail($board);

        $validated = $request->validate([
            'preferred_view' => 'sometimes|string|in:table,kanban,calendar',
            'kanban_config' => 'sometimes|array',
            'calendar_config' => 'sometimes|array',
            'filters' => 'sometimes|array',
        ]);

        $preference = UserBoardViewPreference::updateOrCreate(
            [
                'user_id' => Auth::id(),
                'board_id' => $boardModel->id,
            ],
            $validated
        );

        return response()->json($preference);
    }
}
