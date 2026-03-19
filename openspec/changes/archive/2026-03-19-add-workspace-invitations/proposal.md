# Change: Add Workspace Invitations & User Roles

## Why

The SaaS task manager requires a robust invitation and role management system to enable:
- Flexible permission control at the workspace level for different user types
- Secure invitation workflow for onboarding new team members
- Self-service member management by workspace owners and admins
- Audit trail for access control changes

This feature builds upon the multi-tenant workspace foundation and adds the collaboration layer essential for team productivity.

## What Changes

### Role System
- **Four workspace roles**: Owner, Admin, Member, Viewer with configurable permissions
- **Permission matrix**: granular control over workspace, boards, tasks, members, and analytics
- **Role hierarchy**: Owners can manage all; Admins can manage except ownership transfer

### Invitation System
- **Invitation entity**: token-based with expiry, tied to workspace and role
- **Invitation states**: pending, accepted, expired, cancelled
- **Email integration**: automated invitation emails with accept/decline links
- **New user flow**: register → accept or existing user → accept directly

### Backend (Laravel)
- Invitation model with token generation and expiry
- InvitationController for CRUD and accept/decline actions
- WorkspaceMemberController for member management
- Authorization policies enforcing role-based access
- Email notifications via Laravel Mail

### Frontend (Angular)
- Workspace Members page with role management
- Invite Member modal with email/role inputs
- Accept Invitation page with login/register integration
- Route guards for role-based view access

## Impact

### Affected Specs (New Capabilities)
- `workspace-roles`: Role definitions and permission matrix
- `workspace-invitations`: Invitation lifecycle and token handling
- `workspace-members-ui`: Angular components for member management

### Dependencies
- Requires `add-multi-tenant-workspace` change (workspace entity)
- Requires email delivery service configuration
- Extends `workspace_user` pivot table with role and status

### Affected Code Areas
- **Database**: New `invitations` table, updated `workspace_user` pivot
- **Models**: Invitation model, updated Workspace relationships
- **Controllers**: InvitationController, WorkspaceMemberController
- **Policies**: Updated WorkspacePolicy with permission checks
- **Services**: InvitationService (Angular), WorkspaceMemberService (Angular)
- **Components**: MembersListComponent, InviteMemberModal, AcceptInvitationPage
