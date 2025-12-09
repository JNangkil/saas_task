<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('board.{board}', \App\Broadcasting\BoardChannel::class);
Broadcast::channel('presence-board.{board}', \App\Broadcasting\BoardPresenceChannel::class);
Broadcast::channel('workspace.{workspace}', \App\Broadcasting\WorkspaceChannel::class);

