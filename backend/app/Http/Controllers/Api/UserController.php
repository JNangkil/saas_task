<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateAvatarRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    /**
     * Get the current user's profile.
     */
    public function me(Request $request)
    {
        return new UserResource($request->user());
    }

    /**
     * Update the current user's profile.
     */
    public function updateProfile(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $user->update($request->validated());

        return new UserResource($user);
    }

    /**
     * Upload and update the user's avatar.
     */
    public function updateAvatar(UpdateAvatarRequest $request)
    {
        $user = $request->user();

        // Delete old avatar if exists
        if ($user->avatar_url) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar_url));
        }

        // Store new avatar
        $path = $request->file('avatar')->store('avatars', 'public');
        $user->avatar_url = Storage::url($path);
        $user->save();

        return new UserResource($user);
    }

    /**
     * Remove the user's avatar.
     */
    public function removeAvatar(Request $request)
    {
        $user = $request->user();

        if ($user->avatar_url) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar_url));
            $user->avatar_url = null;
            $user->save();
        }

        return new UserResource($user);
    }
}
