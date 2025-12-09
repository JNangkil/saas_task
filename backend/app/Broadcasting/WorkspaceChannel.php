<?php

namespace App\Broadcasting;

use App\Models\User;
use App\Models\Workspace;

class WorkspaceChannel
{
    /**
     * Authenticate the user's access to the channel.
     */
    public function join(User $user, Workspace $workspace): array|bool
    {
        return $workspace->users()->where('users.id', $user->id)->exists();
    }
}
