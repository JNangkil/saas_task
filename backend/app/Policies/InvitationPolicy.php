<?php

namespace App\Policies;

use App\Models\Invitation;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Auth\Access\Response;

class InvitationPolicy
{
    /**
     * Determine whether the user can view any invitations.
     */
    public function viewAny(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can view the invitation.
     */
    public function view(User $user, Invitation $invitation): bool
    {
        return $invitation->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can create invitations.
     */
    public function create(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can update the invitation.
     */
    public function update(User $user, Invitation $invitation): bool
    {
        return $invitation->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can delete the invitation.
     */
    public function delete(User $user, Invitation $invitation): bool
    {
        return $invitation->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can resend the invitation.
     */
    public function resend(User $user, Invitation $invitation): bool
    {
        return $invitation->workspace->canUserManage($user);
    }

    /**
     * Determine whether the user can manage invitations for the workspace.
     */
    public function manage(User $user, Workspace $workspace): bool
    {
        return $workspace->canUserManage($user);
    }
}