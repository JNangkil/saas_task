<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Onboarding\CompleteOnboardingRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class OnboardingController extends Controller
{
    /**
     * Persist onboarding preferences and mark the current user as completed.
     */
    public function complete(CompleteOnboardingRequest $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $payload = $request->validated();

        $user->forceFill([
            'company_name' => $payload['company_name'],
            'onboarding_completed' => true,
        ])->save();

        if (! empty($payload['invites'])) {
            Log::info('Onboarding invites requested', [
                'user_id' => $user->id,
                'emails' => $payload['invites'],
                'plan' => $payload['plan'],
            ]);
        }

        Log::info('User completed onboarding', [
            'user_id' => $user->id,
            'team_size' => $payload['team_size'],
            'work_style' => $payload['work_style'],
            'plan' => $payload['plan'],
        ]);

        return response()->json([
            'user' => new UserResource($user->refresh()),
        ]);
    }
}
