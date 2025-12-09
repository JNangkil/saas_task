<?php

namespace App\Broadcasting;

use App\Models\Board;
use App\Models\User;

class BoardPresenceChannel
{
    /**
     * Authenticate the user's access to the channel.
     */
    public function join(User $user, Board $board): array|bool
    {
        if ($board->workspace->users()->where('users.id', $user->id)->exists()) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar, // Assuming avatar attribute/accessor exists
            ];
        }

        return false;
    }
}
