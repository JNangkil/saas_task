<?php

namespace App\Broadcasting;

use App\Models\Board;
use App\Models\User;

class BoardChannel
{
    /**
     * Authenticate the user's access to the channel.
     */
    public function join(User $user, Board $board): array|bool
    {
        return $board->workspace->users()->where('users.id', $user->id)->exists();
    }
}
