<?php

namespace App\Services;

use App\Events\InvitationAccepted;
use App\Events\InvitationCancelled;
use App\Events\InvitationCreated;
use App\Events\InvitationDeclined;
use App\Events\InvitationResent;
use App\Enums\WorkspaceRole;
use App\Helpers\WorkspacePermissionHelper;
use App\Mail\InvitationMail;
use App\Models\Invitation;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class InvitationService
{
    /**
     * Create a new workspace invitation
     *
     * @param Workspace $workspace
     * @param User $inviter
     * @param string $email
     * @param string $role
     * @param string|null $message
     * @return array
     */
    public function create(Workspace $workspace, User $inviter, string $email, string $role, ?string $message = null): array
    {
        // Validate role
        if (!WorkspaceRole::isValid($role)) {
            return [
                'success' => false,
                'message' => 'Invalid role specified.',
                'status_code' => 400,
            ];
        }

        // Check if inviter has permission to invite members
        if (!WorkspacePermissionHelper::canInviteMembers($inviter, $workspace)) {
            return [
                'success' => false,
                'message' => 'You do not have permission to invite members to this workspace.',
                'status_code' => 403,
            ];
        }

        // Check if inviter can assign the specified role
        $inviterRole = WorkspacePermissionHelper::getUserRole($inviter, $workspace);
        $targetRole = WorkspaceRole::fromString($role);

        if (!$inviterRole || !$inviterRole->getAssignableRoles()->contains($targetRole)) {
            return [
                'success' => false,
                'message' => 'You cannot assign this role.',
                'status_code' => 403,
            ];
        }

        // Check for existing invitation
        $existingInvitation = $this->findPendingInvitation($workspace, $email);
        if ($existingInvitation) {
            return [
                'success' => false,
                'message' => 'An invitation has already been sent to this email address.',
                'status_code' => 409,
            ];
        }

        // Check if user is already a member
        $existingMember = $workspace->members()
            ->where('email', $email)
            ->where('status', 'active')
            ->first();

        if ($existingMember) {
            return [
                'success' => false,
                'message' => 'This user is already a member of the workspace.',
                'status_code' => 409,
            ];
        }

        // Create invitation
        $invitation = DB::transaction(function () use ($workspace, $inviter, $email, $role, $message) {
            $invitation = Invitation::create([
                'workspace_id' => $workspace->id,
                'tenant_id' => $workspace->tenant_id,
                'email' => strtolower($email),
                'role' => $role,
                'token' => $this->generateToken(),
                'message' => $message,
                'invited_by' => $inviter->id,
                'expires_at' => now()->addDays(config('workspace_permissions.defaults.invitation_expiry_days', 7)),
                'status' => 'pending',
            ]);

            // Send invitation email
            Mail::to($email)->queue(new InvitationMail($invitation));

            // Fire event
            InvitationCreated::dispatch($invitation);

            return $invitation;
        });

        return [
            'success' => true,
            'message' => 'Invitation sent successfully.',
            'data' => $invitation,
            'status_code' => 201,
        ];
    }

    /**
     * Accept an invitation
     *
     * @param string $token
     * @param User|null $user
     * @return array
     */
    public function accept(string $token, ?User $user = null): array
    {
        $invitation = Invitation::where('token', $token)
            ->where('status', 'pending')
            ->first();

        if (!$invitation) {
            return [
                'success' => false,
                'message' => 'Invalid or expired invitation.',
                'status_code' => 404,
            ];
        }

        if ($invitation->isExpired()) {
            return [
                'success' => false,
                'message' => 'This invitation has expired.',
                'status_code' => 410,
            ];
        }

        if (!$user) {
            return [
                'success' => false,
                'message' => 'User must be authenticated to accept invitation.',
                'status_code' => 401,
                'requires_auth' => true,
            ];
        }

        // Check if the invitation email matches the user's email
        if (strtolower($user->email) !== strtolower($invitation->email)) {
            return [
                'success' => false,
                'message' => 'This invitation is not for your email address.',
                'status_code' => 403,
            ];
        }

        // Check if user is already a member
        $existingMembership = $invitation->workspace->members()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if ($existingMembership) {
            // Mark invitation as accepted but don't add user again
            $invitation->update([
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            InvitationAccepted::dispatch($invitation, $user);

            return [
                'success' => true,
                'message' => 'You are already a member of this workspace.',
                'data' => [
                    'workspace' => $invitation->workspace,
                    'already_member' => true,
                ],
                'status_code' => 200,
            ];
        }

        // Accept invitation and add user to workspace
        $result = DB::transaction(function () use ($invitation, $user) {
            // Update invitation
            $invitation->update([
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            // Add user to workspace
            $membership = $invitation->workspace->members()->attach($user->id, [
                'role' => $invitation->role,
                'status' => 'active',
                'joined_at' => now(),
                'email' => $user->email,
            ]);

            // Fire event
            InvitationAccepted::dispatch($invitation, $user);

            return [
                'workspace' => $invitation->workspace->fresh(),
                'membership' => $membership,
            ];
        });

        return [
            'success' => true,
            'message' => 'Invitation accepted successfully.',
            'data' => $result,
            'status_code' => 200,
        ];
    }

    /**
     * Decline an invitation
     *
     * @param string $token
     * @return array
     */
    public function decline(string $token): array
    {
        $invitation = Invitation::where('token', $token)
            ->where('status', 'pending')
            ->first();

        if (!$invitation) {
            return [
                'success' => false,
                'message' => 'Invalid or expired invitation.',
                'status_code' => 404,
            ];
        }

        if ($invitation->isExpired()) {
            return [
                'success' => false,
                'message' => 'This invitation has expired.',
                'status_code' => 410,
            ];
        }

        // Update invitation
        $invitation->update([
            'status' => 'declined',
            'accepted_at' => now(),
        ]);

        // Fire event
        InvitationDeclined::dispatch($invitation);

        return [
            'success' => true,
            'message' => 'Invitation declined.',
            'status_code' => 200,
        ];
    }

    /**
     * Cancel an invitation
     *
     * @param Invitation $invitation
     * @param User $user
     * @return array
     */
    public function cancel(Invitation $invitation, User $user): array
    {
        // Check if user can cancel this invitation
        if (!$this->canManageInvitation($invitation, $user)) {
            return [
                'success' => false,
                'message' => 'You do not have permission to cancel this invitation.',
                'status_code' => 403,
            ];
        }

        if ($invitation->status !== 'pending') {
            return [
                'success' => false,
                'message' => 'This invitation cannot be cancelled.',
                'status_code' => 400,
            ];
        }

        // Update invitation
        $invitation->update([
            'status' => 'cancelled',
        ]);

        // Fire event
        InvitationCancelled::dispatch($invitation);

        return [
            'success' => true,
            'message' => 'Invitation cancelled successfully.',
            'status_code' => 200,
        ];
    }

    /**
     * Resend an invitation
     *
     * @param Invitation $invitation
     * @param User $user
     * @return array
     */
    public function resend(Invitation $invitation, User $user): array
    {
        // Check if user can manage this invitation
        if (!$this->canManageInvitation($invitation, $user)) {
            return [
                'success' => false,
                'message' => 'You do not have permission to resend this invitation.',
                'status_code' => 403,
            ];
        }

        if ($invitation->status !== 'pending') {
            return [
                'success' => false,
                'message' => 'This invitation cannot be resent.',
                'status_code' => 400,
            ];
        }

        // Update invitation
        $invitation->update([
            'token' => $this->generateToken(),
            'expires_at' => now()->addDays(config('workspace_permissions.defaults.invitation_expiry_days', 7)),
        ]);

        // Resend email
        Mail::to($invitation->email)->queue(new InvitationMail($invitation));

        // Fire event
        InvitationResent::dispatch($invitation);

        return [
            'success' => true,
            'message' => 'Invitation resent successfully.',
            'data' => $invitation->fresh(),
            'status_code' => 200,
        ];
    }

    /**
     * Get invitation by token (public endpoint)
     *
     * @param string $token
     * @return array
     */
    public function getByToken(string $token): array
    {
        $invitation = Invitation::with(['workspace', 'inviter'])
            ->where('token', $token)
            ->where('status', 'pending')
            ->first();

        if (!$invitation) {
            return [
                'success' => false,
                'message' => 'Invalid or expired invitation.',
                'status_code' => 404,
            ];
        }

        return [
            'success' => true,
            'data' => $invitation,
            'status_code' => 200,
        ];
    }

    /**
     * Clean up expired invitations
     *
     * @return int Number of cleaned up invitations
     */
    public function cleanupExpired(): int
    {
        return Invitation::where('status', 'pending')
            ->where('expires_at', '<', now())
            ->update(['status' => 'expired']);
    }

    /**
     * Find a pending invitation for a workspace and email
     *
     * @param Workspace $workspace
     * @param string $email
     * @return Invitation|null
     */
    private function findPendingInvitation(Workspace $workspace, string $email): ?Invitation
    {
        return $workspace->invitations()
            ->where('email', strtolower($email))
            ->where('status', 'pending')
            ->first();
    }

    /**
     * Check if a user can manage an invitation
     *
     * @param Invitation $invitation
     * @param User $user
     * @return bool
     */
    private function canManageInvitation(Invitation $invitation, User $user): bool
    {
        // Workspace owner can manage all invitations
        if ($invitation->workspace->owner_id === $user->id) {
            return true;
        }

        // The inviter can manage their own invitations
        if ($invitation->invited_by === $user->id) {
            return true;
        }

        // Check if user has permission to manage members
        return WorkspacePermissionHelper::canRemoveMembers($user, $invitation->workspace);
    }

    /**
     * Generate a secure invitation token
     *
     * @return string
     */
    private function generateToken(): string
    {
        return Str::random(48);
    }
}