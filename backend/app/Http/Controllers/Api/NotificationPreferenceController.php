<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotificationPreference;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NotificationPreferenceController extends Controller
{
    /**
     * Get the notification preferences for the current user.
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();

        $preference = $user->notificationPreference ?? $user->notificationPreference()->create([
            'preferences' => UserNotificationPreference::getDefaultPreferences()
        ]);

        return response()->json([
            'preferences' => $preference->preferences,
        ]);
    }

    /**
     * Update the notification preferences for the current user.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preferences' => 'required|array',
            'preferences.*.in_app' => 'required|boolean',
            'preferences.*.email' => 'required|boolean',
        ]);

        $user = Auth::user();
        $preference = $user->notificationPreference ?? $user->notificationPreference()->create([
            'preferences' => UserNotificationPreference::getDefaultPreferences()
        ]);

        // Merge with existing preferences to ensure all types are present
        $defaultPreferences = UserNotificationPreference::getDefaultPreferences();
        $updatedPreferences = array_merge($defaultPreferences, $validated['preferences']);

        $preference->update([
            'preferences' => $updatedPreferences,
        ]);

        return response()->json([
            'message' => 'Notification preferences updated successfully',
            'preferences' => $updatedPreferences,
        ]);
    }
}