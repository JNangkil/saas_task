<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\UserBoardViewPreference;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class BoardViewPreferenceController extends Controller
{
    public function show(Request $request, Board $board): JsonResponse
    {
        $preference = UserBoardViewPreference::firstOrCreate(
            [
                'user_id' => Auth::id(),
                'board_id' => $board->id,
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

    public function update(Request $request, Board $board): JsonResponse
    {
        $validated = $request->validate([
            'preferred_view' => 'sometimes|string|in:table,kanban,calendar',
            'kanban_config' => 'sometimes|array',
            'calendar_config' => 'sometimes|array',
            'filters' => 'sometimes|array',
        ]);

        $preference = UserBoardViewPreference::updateOrCreate(
            [
                'user_id' => Auth::id(),
                'board_id' => $board->id,
            ],
            $validated
        );

        return response()->json($preference);
    }
}
