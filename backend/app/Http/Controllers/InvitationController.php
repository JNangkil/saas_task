<?php

namespace App\Http\Controllers;

use App\Http\Requests\AcceptInvitationRequest;
use App\Http\Requests\InvitationRequest;
use App\Http\Resources\InvitationResource;
use App\Http\Resources\WorkspaceResource;
use App\Models\Invitation;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;

class InvitationController extends Controller
{
    use AuthorizesRequests;

    /**
     * Store a newly created invitation in storage.
     */
    public function store(Workspace $workspace, InvitationRequest $request): JsonResponse
    {
        $this->authorize('create', [Invitation::class, $workspace]);

        $validated = $request->validated();

        // Check if email is already a member
        if ($workspace->users()->where('email', $validated['email'])->exists()) {
            return response()->json([
                'error' => 'Validation Error',
                'message' => 'User with this email is already a member of this workspace',
            ], 422);
        }

        // Check if email has pending invitation
        $existingInvitation = Invitation::where('workspace_id', $workspace->id)
            ->where('email', $validated['email'])
            ->where('status', 'pending')
            ->first();

        if ($existingInvitation) {
            return response()->json([
                'error' => 'Validation Error',
                'message' => 'User with this email already has a pending invitation',
            ], 422);
        }

        return DB::transaction(function () use ($workspace, $validated) {
            $user = Auth::user();
            $invitation = Invitation::create([
                'workspace_id' => $workspace->id,
                'tenant_id' => $workspace->tenant_id,
                'email' => $validated['email'],
                'role' => $validated['role'],
                'token' => Invitation::generateToken(),
                'message' => $validated['message'] ?? null,
                'invited_by' => $user->id,
                'expires_at' => now()->addDays(7),
                'status' => 'pending',
            ]);

            // Send invitation email
            try {
                Mail::to($validated['email'])->send(new \App\Mail\WorkspaceInvitation($invitation));
            } catch (\Exception $e) {
                // Log error but continue with invitation creation
                \Log::error('Failed to send invitation email: ' . $e->getMessage());
            }

            return (new InvitationResource($invitation->load(['workspace', 'invitedBy'])))
                ->response()
                ->setStatusCode(201);
        });
    }

    /**
     * Display a listing of pending invitations for a workspace.
     */
    public function index(Workspace $workspace, Request $request): JsonResponse
    {
        $this->authorize('viewAny', [Invitation::class, $workspace]);

        $invitations = Invitation::where('workspace_id', $workspace->id)
            ->where('status', 'pending')
            ->with(['invitedBy'])
            ->when($request->get('search'), function ($query, $search) {
                $query->where('email', 'like', "%{$search}%");
            })
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return InvitationResource::collection($invitations)->response();
    }

    /**
     * Remove the specified invitation from storage.
     */
    public function destroy(Workspace $workspace, Invitation $invitation): JsonResponse
    {
        $this->authorize('delete', $invitation);
        
        // Verify invitation belongs to this workspace
        if ($invitation->workspace_id !== $workspace->id) {
            return response()->json([
                'error' => 'Not Found',
                'message' => 'Invitation not found in this workspace',
            ], 404);
        }

        $invitation->delete();

        return response()->json([
            'message' => 'Invitation cancelled successfully',
        ]);
    }

    /**
     * Resend the invitation email.
     */
    public function resend(Workspace $workspace, Invitation $invitation): JsonResponse
    {
        $this->authorize('resend', $invitation);
        
        // Verify invitation belongs to this workspace
        if ($invitation->workspace_id !== $workspace->id) {
            return response()->json([
                'error' => 'Not Found',
                'message' => 'Invitation not found in this workspace',
            ], 404);
        }

        // Update invitation expiry
        $invitation->update([
            'expires_at' => now()->addDays(7),
        ]);

        // Resend email
        try {
            Mail::to($invitation->email)->send(new \App\Mail\WorkspaceInvitation($invitation));
        } catch (\Exception $e) {
            // Log error but continue with invitation update
            \Log::error('Failed to resend invitation email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Invitation resent successfully',
        ]);
    }

    /**
     * Display the specified invitation by token (public endpoint).
     */
    public function show($token): JsonResponse
    {
        $invitation = Invitation::where('token', $token)
            ->with(['workspace', 'tenant'])
            ->first();

        if (!$invitation) {
            return response()->json([
                'error' => 'Not Found',
                'message' => 'Invitation not found',
            ], 404);
        }

        // Check if invitation is valid (pending and not expired)
        if (!$invitation->canBeAccepted()) {
            $message = $invitation->isExpired() 
                ? 'This invitation has expired' 
                : 'This invitation is no longer valid';

            return response()->json([
                'error' => 'Invalid Invitation',
                'message' => $message,
            ], 422);
        }

        return new InvitationResource($invitation);
    }

    /**
     * Accept an invitation.
     */
    public function accept($token, AcceptInvitationRequest $request): JsonResponse
    {
        $invitation = Invitation::where('token', $token)
            ->with(['workspace', 'tenant'])
            ->first();

        if (!$invitation) {
            return response()->json([
                'error' => 'Not Found',
                'message' => 'Invitation not found',
            ], 404);
        }

        // Check if invitation is acceptable
        if (!$invitation->canBeAccepted()) {
            $message = $invitation->isExpired()
                ? 'This invitation has expired'
                : 'This invitation is no longer valid';

            return response()->json([
                'error' => 'Invalid Invitation',
                'message' => $message,
            ], 422);
        }

        $user = User::where('email', $invitation->email)->first();

        return DB::transaction(function () use ($invitation, $user, $request) {
            if ($user) {
                // Check if user belongs to tenant
                if (!$invitation->tenant->users()->where('users.id', $user->id)->exists()) {
                    return response()->json([
                        'error' => 'Unauthorized',
                        'message' => 'You must be a member of the tenant to accept this invitation',
                    ], 403);
                }

                // Add user to workspace with specified role
                $invitation->workspace->users()->attach($user->id, [
                    'role' => $invitation->role,
                    'joined_at' => now(),
                ]);

                // Update invitation status
                $invitation->update([
                    'status' => 'accepted',
                    'accepted_at' => now(),
                ]);

                return response()->json([
                    'message' => 'Invitation accepted successfully',
                    'workspace' => new WorkspaceResource($invitation->workspace),
                ]);
            } else {
                // Check if registration data is provided
                if ($request->has('name') && $request->has('password')) {
                    $validated = $request->validated();
                     
                    // Create new user
                    $user = User::create([
                        'name' => $validated['name'],
                        'email' => $invitation->email,
                        'password' => Hash::make($validated['password']),
                    ]);

                    // Add user to tenant
                    $invitation->tenant->users()->attach($user->id, [
                        'role' => 'member',
                        'joined_at' => now(),
                    ]);

                    // Add user to workspace with specified role
                    $invitation->workspace->users()->attach($user->id, [
                        'role' => $invitation->role,
                        'joined_at' => now(),
                    ]);

                    // Update invitation status
                    $invitation->update([
                        'status' => 'accepted',
                        'accepted_at' => now(),
                    ]);

                    return response()->json([
                        'message' => 'Registration successful and invitation accepted',
                        'workspace' => new WorkspaceResource($invitation->workspace),
                    ]);
                } else {
                    // User doesn't exist, return registration requirements
                    return response()->json([
                        'message' => 'You need to register before accepting this invitation',
                        'requires_registration' => true,
                        'email' => $invitation->email,
                        'workspace' => [
                            'id' => $invitation->workspace->id,
                            'name' => $invitation->workspace->name,
                            'role' => $invitation->role,
                        ],
                        'tenant' => [
                            'id' => $invitation->tenant->id,
                            'name' => $invitation->tenant->name,
                            'slug' => $invitation->tenant->slug,
                        ],
                    ]);
                }
            }
        });
    }

    /**
     * Decline an invitation.
     */
    public function decline($token): JsonResponse
    {
        $invitation = Invitation::where('token', $token)->first();

        if (!$invitation) {
            return response()->json([
                'error' => 'Not Found',
                'message' => 'Invitation not found',
            ], 404);
        }

        // Check if invitation is still pending
        if (!$invitation->isPending()) {
            return response()->json([
                'error' => 'Invalid Invitation',
                'message' => 'This invitation can no longer be declined',
            ], 422);
        }

        // Update invitation status
        $invitation->update([
            'status' => 'cancelled',
        ]);

        return response()->json([
            'message' => 'Invitation declined successfully',
        ]);
    }
}