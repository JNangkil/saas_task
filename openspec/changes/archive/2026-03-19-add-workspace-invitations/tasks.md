# Tasks: Add Workspace Invitations & User Roles

## 1. Database Schema & Migrations

- [x] 1.1 Update `workspace_user` pivot table (add role enum, status, invited_by, joined_at)
- [x] 1.2 Create `invitations` table (id, workspace_id, tenant_id, email, role, token, message, invited_by, expires_at, status, accepted_at, created_at, updated_at)
- [x] 1.3 Create `workspace_role_permissions` config or table for permission matrix
- [x] 1.4 Add indexes for invitation token lookup and workspace+email uniqueness
- [x] 1.5 Create foreign key constraints with appropriate cascade rules

## 2. Laravel Models & Relationships

- [x] 2.1 Create Invitation model with relationships (workspace, inviter, invitee)
- [x] 2.2 Update Workspace model with members relationship and role scopes
- [x] 2.3 Create WorkspaceRole enum/class with permission definitions
- [x] 2.4 Add model factories for Invitation testing

## 3. Role & Permission System

- [x] 3.1 Define permission matrix (workspace.manage, boards.manage, tasks.create, members.invite, etc.)
- [x] 3.2 Create WorkspacePermission helper to check user permissions
- [x] 3.3 Update WorkspacePolicy with role-based permission checks
- [x] 3.4 Create middleware/gate for permission validation

## 4. Invitation Backend Logic

- [x] 4.1 Create InvitationService with create, accept, decline, cancel, resend methods
- [x] 4.2 Implement token generation (secure random, 48 chars)
- [x] 4.3 Implement expiry logic (default 7 days, configurable)
- [x] 4.4 Add duplicate invitation prevention (same workspace+email+pending)
- [x] 4.5 Create InvitationMail notification with accept link

## 5. Laravel API Endpoints - Invitations

- [x] 5.1 Create InvitationController with store, show (by token), accept, decline
- [x] 5.2 POST /api/workspaces/{workspace}/invitations (create invitation)
- [x] 5.3 GET /api/invitations/{token} (view invitation details - public)
- [x] 5.4 POST /api/invitations/{token}/accept (accept invitation)
- [x] 5.5 POST /api/invitations/{token}/decline (decline invitation)
- [x] 5.6 DELETE /api/workspaces/{workspace}/invitations/{id} (cancel pending)
- [x] 5.7 POST /api/workspaces/{workspace}/invitations/{id}/resend (resend email)
- [x] 5.8 Create InvitationRequest validation classes

## 6. Laravel API Endpoints - Members

- [x] 6.1 Create WorkspaceMemberController with index, update, destroy
- [x] 6.2 GET /api/workspaces/{workspace}/members (list members + pending invites)
- [x] 6.3 PATCH /api/workspaces/{workspace}/members/{user} (change role)
- [x] 6.4 DELETE /api/workspaces/{workspace}/members/{user} (remove member)
- [x] 6.5 Create MemberResource for API response formatting
- [x] 6.6 Implement pagination and filtering for member list

## 7. Email Notifications

- [x] 7.1 Create InvitationMail with HTML template
- [x] 7.2 Include workspace name, inviter name, role, message, accept link
- [x] 7.3 Queue email delivery for performance
- [x] 7.4 Handle email delivery failures gracefully

## 8. Angular Services

- [x] 8.1 Create InvitationService with API integration methods
- [x] 8.2 Create WorkspaceMemberService with API integration methods
- [x] 8.3 Add invitation types and interfaces
- [x] 8.4 Implement permission checking helpers

## 9. Angular UI - Members Page

- [x] 9.1 Create WorkspaceMembersComponent (route: /workspaces/{id}/members)
- [x] 9.2 Display member list with avatar, name, email, role, status
- [x] 9.3 Add role change dropdown (for authorized users)
- [x] 9.4 Implement remove member with confirmation modal
- [x] 9.5 Show pending invitations section with cancel/resend actions
- [x] 9.6 Add loading states and error handling

## 10. Angular UI - Invite Modal

- [x] 10.1 Create InviteMemberModalComponent
- [x] 10.2 Add form fields: email (required), role (dropdown), message (optional)
- [x] 10.3 Email validation and duplicate check
- [x] 10.4 Success/error toast notifications
- [x] 10.5 Close modal and refresh list on success

## 11. Angular UI - Accept Invitation Page

- [x] 11.1 Create AcceptInvitationComponent (route: /invitations/{token})
- [x] 11.2 Display invitation details (workspace name, inviter, role)
- [x] 11.3 Handle logged-out state: show login/register options
- [x] 11.4 Handle logged-in state: show accept/decline buttons
- [x] 11.5 Handle expired/invalid token gracefully
- [x] 11.6 Redirect to workspace on successful accept

## 12. Route Guards & Authorization

- [x] 12.1 Create WorkspaceRoleGuard for route protection
- [x] 12.2 Protect member management routes (Owner/Admin only)
- [x] 12.3 Add permission directive for UI element visibility
- [x] 12.4 Handle unauthorized access with appropriate redirects

## 13. Testing & Validation

- [x] 13.1 PHPUnit tests for Invitation CRUD operations
- [x] 13.2 PHPUnit tests for invitation accept/decline flow
- [x] 13.3 PHPUnit tests for role-based authorization
- [x] 13.4 PHPUnit tests for duplicate invitation prevention
- [x] 13.5 Angular unit tests for InvitationService
- [x] 13.6 Angular unit tests for WorkspaceMembersComponent
- [ ] 13.7 E2E test: invite → email → accept → member list
