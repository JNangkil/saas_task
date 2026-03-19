## ADDED Requirements

### Requirement: Invitation Entity
The system SHALL provide an Invitation entity for inviting users to workspaces. Each Invitation SHALL have the following attributes:
- **id**: Unique identifier (UUID or auto-increment)
- **workspace_id**: Foreign key to workspaces (required)
- **tenant_id**: Foreign key to tenants (required, denormalized for scoping)
- **email**: Invitee's email address (required, max 255 characters)
- **role**: Role to assign upon acceptance (required, enum: admin, member, viewer)
- **token**: Unique secure token for acceptance link (required, 48 characters)
- **message**: Optional personal message from inviter (max 500 characters)
- **invited_by**: Foreign key to users (the inviter)
- **expires_at**: Expiration timestamp (required, default: 7 days from creation)
- **status**: Invitation state (pending, accepted, declined, cancelled)
- **accepted_at**: Timestamp when invitation was accepted (nullable)
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### Scenario: Create a new invitation
- **WHEN** an Admin sends an invitation to "john@example.com" with role "member"
- **THEN** the system creates an Invitation record
- **AND** generates a unique 48-character token
- **AND** sets expires_at to 7 days in the future
- **AND** sets status to "pending"
- **AND** sends an invitation email

#### Scenario: Prevent duplicate pending invitations
- **WHEN** an Admin invites "john@example.com" who already has a pending invitation to the same workspace
- **THEN** the system returns validation error "An invitation is already pending for this email"

#### Scenario: Allow re-invite after expiry or decline
- **WHEN** an Admin invites "john@example.com" whose previous invitation was expired or declined
- **THEN** the system creates a new invitation successfully

---

### Requirement: Invitation State Transitions
The system SHALL manage invitation states with the following valid transitions:
- **pending** → **accepted**: When invitee accepts the invitation
- **pending** → **declined**: When invitee declines the invitation
- **pending** → **cancelled**: When workspace admin cancels the invitation
- **pending** → **expired**: Virtual state when expires_at < current time

#### Scenario: Accept pending invitation
- **WHEN** a user with matching email accepts a pending invitation
- **THEN** the status changes to "accepted"
- **AND** accepted_at is set to current timestamp
- **AND** a workspace_user record is created with the specified role

#### Scenario: Decline pending invitation
- **WHEN** a user declines a pending invitation
- **THEN** the status changes to "declined"
- **AND** no workspace_user record is created

#### Scenario: Cancel pending invitation
- **WHEN** a workspace Admin cancels a pending invitation
- **THEN** the status changes to "cancelled"
- **AND** the invitation email link becomes invalid

#### Scenario: Expired invitation handling
- **WHEN** a user attempts to accept an invitation where expires_at < now()
- **THEN** the system returns error "This invitation has expired"
- **AND** suggests requesting a new invitation

---

### Requirement: Invitation API Endpoints
The system SHALL expose REST API endpoints for invitation management.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/workspaces/{workspace}/invitations | Yes | Create invitation |
| GET | /api/workspaces/{workspace}/invitations | Yes | List pending invitations |
| DELETE | /api/workspaces/{workspace}/invitations/{id} | Yes | Cancel invitation |
| POST | /api/workspaces/{workspace}/invitations/{id}/resend | Yes | Resend email |
| GET | /api/invitations/{token} | No | View invitation details |
| POST | /api/invitations/{token}/accept | Yes | Accept invitation |
| POST | /api/invitations/{token}/decline | Yes | Decline invitation |

#### Scenario: Create invitation with authorization
- **WHEN** a Member attempts to create an invitation
- **THEN** the system returns HTTP 403 Forbidden
- **AND** only Owner and Admin roles can create invitations

#### Scenario: View invitation by token (public)
- **WHEN** any user (authenticated or not) requests GET /api/invitations/{token}
- **THEN** the system returns invitation details if token is valid:
  - workspace name
  - inviter name
  - assigned role
  - status
  - expires_at
- **AND** does NOT expose sensitive data (invitee email, internal IDs)

#### Scenario: List workspace invitations
- **WHEN** an Admin requests GET /api/workspaces/{workspace}/invitations
- **THEN** the system returns paginated list of pending invitations
- **AND** includes email, role, invited_by name, expires_at, created_at

---

### Requirement: Invitation Request Validation
The system SHALL validate all invitation API requests.

**Create Invitation (POST /api/workspaces/{workspace}/invitations):**
| Field | Rules |
|-------|-------|
| email | required, email, max:255, not existing member, no pending invite |
| role | required, in:admin,member,viewer |
| message | nullable, string, max:500 |

**Request Payload:**
```json
{
  "email": "john@example.com",
  "role": "member",
  "message": "Welcome to the team!"
}
```

**Response Payload (201 Created):**
```json
{
  "id": "uuid",
  "email": "john@example.com",
  "role": "member",
  "status": "pending",
  "expires_at": "2024-01-14T10:00:00Z",
  "invited_by": {
    "id": "uuid",
    "name": "Jane Admin"
  }
}
```

#### Scenario: Validate email is not existing member
- **WHEN** an Admin invites an email that belongs to an existing workspace member
- **THEN** the system returns HTTP 422 with error "User is already a member of this workspace"

#### Scenario: Validate email format
- **WHEN** an invitation request has invalid email "notanemail"
- **THEN** the system returns HTTP 422 with email validation error

---

### Requirement: Invitation Email Notification
The system SHALL send an email notification when an invitation is created.

#### Scenario: Send invitation email
- **WHEN** an invitation is successfully created
- **THEN** an email is sent to the invitee containing:
  - Subject: "You've been invited to join {workspace name}"
  - Workspace name and description
  - Inviter's name
  - Assigned role
  - Personal message (if provided)
  - Accept button/link with token
  - Decline button/link
  - Expiration notice

#### Scenario: Resend invitation email
- **WHEN** an Admin requests POST /api/workspaces/{workspace}/invitations/{id}/resend
- **THEN** the system sends another email to the invitee
- **AND** updates the expires_at to 7 days from now
- **AND** enforces a 5-minute cooldown between resends

#### Scenario: Resend cooldown
- **WHEN** an Admin attempts to resend within 5 minutes of the last send
- **THEN** the system returns HTTP 429 with error "Please wait before resending"

---

### Requirement: Invitation Acceptance Flow
The system SHALL support different acceptance flows based on user state.

#### Scenario: Existing user accepts invitation
- **WHEN** a logged-in user accepts an invitation matching their email
- **THEN** the system creates a workspace_user record
- **AND** marks the invitation as accepted
- **AND** redirects the user to the workspace

#### Scenario: New user accepts invitation
- **WHEN** an unauthenticated user views an invitation
- **THEN** the page shows invitation details
- **AND** provides "Create Account" and "Log In" options
- **AND** after authentication, the user is returned to accept the invitation

#### Scenario: Email mismatch handling
- **WHEN** a logged-in user attempts to accept an invitation for a different email
- **THEN** the system returns error "Please log in with {invited email} to accept"
- **AND** provides option to log out and use correct account

---

### Requirement: Invitation Cleanup
The system SHALL periodically clean up expired invitations.

#### Scenario: Scheduled cleanup job
- **WHEN** the scheduled invitation cleanup runs (daily recommended)
- **THEN** invitations with status "pending" and expires_at < 30 days ago are deleted
- **AND** accepted/declined/cancelled invitations older than 90 days are deleted
- **AND** deletion is logged for audit purposes
