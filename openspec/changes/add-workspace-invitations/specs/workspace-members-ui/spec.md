## ADDED Requirements

### Requirement: Workspace Members API Endpoints
The system SHALL expose REST API endpoints for managing workspace members.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces/{workspace}/members | List all members and pending invites |
| PATCH | /api/workspaces/{workspace}/members/{user} | Update member role |
| DELETE | /api/workspaces/{workspace}/members/{user} | Remove member |

#### Scenario: List workspace members
- **WHEN** a workspace member requests GET /api/workspaces/{workspace}/members
- **THEN** the system returns a paginated list including:
  - Active members with user details, role, joined_at
  - Pending invitations with email, role, invited_at, expires_at
- **AND** results are ordered by role priority (Owner > Admin > Member > Viewer)

**Response Payload:**
```json
{
  "members": [
    {
      "id": "uuid",
      "name": "John Owner",
      "email": "john@example.com",
      "avatar_url": "...",
      "role": "owner",
      "status": "active",
      "joined_at": "2024-01-01T10:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Jane Admin",
      "email": "jane@example.com",
      "avatar_url": "...",
      "role": "admin",
      "status": "active",
      "joined_at": "2024-01-02T10:00:00Z"
    }
  ],
  "pending_invitations": [
    {
      "id": "uuid",
      "email": "pending@example.com",
      "role": "member",
      "status": "pending",
      "invited_by": "Jane Admin",
      "expires_at": "2024-01-14T10:00:00Z"
    }
  ],
  "meta": {
    "total_members": 5,
    "total_pending": 2
  }
}
```

#### Scenario: Update member role with authorization
- **WHEN** an Admin sends PATCH /api/workspaces/{workspace}/members/{user} with role "viewer"
- **THEN** the member's role is updated to "viewer"
- **AND** the updated member record is returned

**Request Payload:**
```json
{
  "role": "viewer"
}
```

#### Scenario: Remove member from workspace
- **WHEN** an Admin sends DELETE /api/workspaces/{workspace}/members/{user}
- **THEN** the workspace_user record is deleted
- **AND** the user loses access to the workspace

#### Scenario: Cannot remove workspace owner
- **WHEN** an attempt is made to remove the workspace Owner
- **THEN** the system returns HTTP 422 with error "Cannot remove workspace owner"

#### Scenario: Member leaves workspace
- **WHEN** a member requests DELETE /api/workspaces/{workspace}/members/{self}
- **THEN** the system removes the member (self-removal allowed)
- **AND** Owner cannot leave without transferring ownership first

---

### Requirement: Workspace Members List Component
The Angular application SHALL provide a WorkspaceMembersComponent for displaying and managing workspace members.

#### Scenario: Display members list
- **WHEN** a user navigates to /workspaces/{id}/members
- **THEN** a list of members is displayed showing:
  - User avatar and name
  - Email address
  - Role badge (color-coded: Owner=gold, Admin=blue, Member=gray, Viewer=light)
  - Status indicator (active/pending)
  - Joined date

#### Scenario: Filter and search members
- **WHEN** a user enters text in the search field
- **THEN** the member list filters by name or email
- **AND** supports filtering by role via dropdown

#### Scenario: Role change dropdown
- **WHEN** an Admin/Owner views the members list
- **THEN** each member (except Owner) shows a role dropdown
- **AND** selecting a new role triggers an immediate PATCH request
- **AND** success/error toast is displayed

#### Scenario: Role change dropdown visibility
- **WHEN** a Member or Viewer views the members list
- **THEN** role dropdowns are hidden (read-only view)
- **AND** remove buttons are hidden

#### Scenario: Remove member action
- **WHEN** an Admin clicks "Remove" on a member
- **THEN** a confirmation modal appears with:
  - Member name and email
  - Warning about access removal
  - "Remove" and "Cancel" buttons
- **AND** on confirm, the member is removed and list refreshes

---

### Requirement: Invite Member Modal Component
The Angular application SHALL provide an InviteMemberModalComponent for sending workspace invitations.

#### Scenario: Open invite modal
- **WHEN** an Admin/Owner clicks "Invite Member" button
- **THEN** a modal dialog appears with:
  - Email input field (required)
  - Role selection dropdown (default: Member)
  - Optional message textarea
  - "Send Invitation" and "Cancel" buttons

#### Scenario: Submit invitation
- **WHEN** a user fills out the form and clicks "Send Invitation"
- **THEN** a POST request is sent to /api/workspaces/{workspace}/invitations
- **AND** on success, a toast shows "Invitation sent to {email}"
- **AND** the modal closes
- **AND** the members list refreshes to show the pending invitation

#### Scenario: Handle duplicate invitation error
- **WHEN** the API returns error for duplicate pending invitation
- **THEN** the form displays error "An invitation is already pending for this email"
- **AND** the modal remains open for correction

#### Scenario: Handle existing member error
- **WHEN** the invited email belongs to an existing member
- **THEN** the form displays error "User is already a member"

---

### Requirement: Accept Invitation Page Component
The Angular application SHALL provide an AcceptInvitationComponent for handling invitation acceptance.

#### Scenario: Display invitation details
- **WHEN** a user navigates to /invitations/{token}
- **THEN** the page displays:
  - Workspace name and description
  - Inviter's name
  - Assigned role
  - Personal message (if any)
  - Expiration countdown
- **AND** fetches data from GET /api/invitations/{token}

#### Scenario: Logged-in user matching email
- **WHEN** a logged-in user views an invitation matching their email
- **THEN** "Accept" and "Decline" buttons are displayed
- **AND** clicking "Accept" calls POST /api/invitations/{token}/accept
- **AND** on success, redirects to the workspace

#### Scenario: Logged-in user with different email
- **WHEN** a logged-in user views an invitation for a different email
- **THEN** a message displays "This invitation is for {email}"
- **AND** "Log out and use correct account" option is provided
- **AND** Accept/Decline buttons are disabled

#### Scenario: Unauthenticated user view
- **WHEN** an unauthenticated user views an invitation
- **THEN** invitation details are shown
- **AND** "Create Account" and "Log In" buttons are displayed
- **AND** after authentication, user is redirected back to this page

#### Scenario: Expired invitation display
- **WHEN** a user views an expired invitation
- **THEN** a message displays "This invitation has expired"
- **AND** Accept/Decline buttons are hidden
- **AND** "Request new invitation" suggestion is shown

#### Scenario: Invalid token handling
- **WHEN** a user navigates to /invitations/{invalid-token}
- **THEN** a message displays "Invitation not found or invalid"
- **AND** link to home page is provided

---

### Requirement: Angular Member Services
The Angular application SHALL provide services for member and invitation management.

```typescript
interface IWorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  joined_at?: string;
}

interface IInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message?: string;
  expires_at: string;
  invited_by: { id: string; name: string };
}

interface IInvitationDetails {
  workspace_name: string;
  workspace_description?: string;
  inviter_name: string;
  role: string;
  message?: string;
  status: string;
  expires_at: string;
}
```

#### Scenario: WorkspaceMemberService methods
- **WHEN** the service is used
- **THEN** it provides:
  - getMembers(workspaceId): Observable<IMembersResponse>
  - updateMemberRole(workspaceId, userId, role): Observable<IWorkspaceMember>
  - removeMember(workspaceId, userId): Observable<void>

#### Scenario: InvitationService methods
- **WHEN** the service is used
- **THEN** it provides:
  - sendInvitation(workspaceId, data): Observable<IInvitation>
  - getInvitationByToken(token): Observable<IInvitationDetails>
  - acceptInvitation(token): Observable<void>
  - declineInvitation(token): Observable<void>
  - cancelInvitation(workspaceId, invitationId): Observable<void>
  - resendInvitation(workspaceId, invitationId): Observable<void>

---

### Requirement: Role-Based Route Guards
The Angular application SHALL implement route guards for role-based access control.

#### Scenario: Protect member management routes
- **WHEN** a Member navigates to /workspaces/{id}/settings
- **THEN** the route guard checks workspace permissions
- **AND** if not Admin/Owner, redirects to workspace dashboard
- **AND** displays toast "You don't have permission to access this page"

#### Scenario: Permission directive for UI elements
- **WHEN** a component uses *hasPermission="'members.invite'" directive
- **THEN** the element is shown only if user has the permission
- **AND** hidden otherwise

```html
<button *hasPermission="'members.invite'; workspace: currentWorkspace">
  Invite Member
</button>
```

---

### Requirement: Role and Permission Error Handling
The Angular application SHALL handle role-related errors gracefully.

#### Scenario: Handle 403 permission denied
- **WHEN** an API call returns 403 for insufficient permissions
- **THEN** a toast displays "You don't have permission for this action"
- **AND** the UI remains in a consistent state

#### Scenario: Handle role change failure
- **WHEN** a role change API call fails
- **THEN** the dropdown reverts to the original role
- **AND** an error toast is displayed
