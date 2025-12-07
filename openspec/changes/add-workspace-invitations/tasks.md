# Tasks: Add Workspace Invitations & User Roles

## 1. Database Schema & Migrations

- [ ] 1.1 Update `workspace_user` pivot table (add role enum, status, invited_by, joined_at)
- [ ] 1.2 Create `invitations` table (id, workspace_id, tenant_id, email, role, token, message, invited_by, expires_at, status, accepted_at, created_at, updated_at)
- [ ] 1.3 Create `workspace_role_permissions` config or table for permission matrix
- [ ] 1.4 Add indexes for invitation token lookup and workspace+email uniqueness
- [ ] 1.5 Create foreign key constraints with appropriate cascade rules

## 2. Laravel Models & Relationships

- [ ] 2.1 Create Invitation model with relationships (workspace, inviter, invitee)
- [ ] 2.2 Update Workspace model with members relationship and role scopes
- [ ] 2.3 Create WorkspaceRole enum/class with permission definitions
- [ ] 2.4 Add model factories for Invitation testing

## 3. Role & Permission System

- [ ] 3.1 Define permission matrix (workspace.manage, boards.manage, tasks.create, members.invite, etc.)
- [ ] 3.2 Create WorkspacePermission helper to check user permissions
- [ ] 3.3 Update WorkspacePolicy with role-based permission checks
- [ ] 3.4 Create middleware/gate for permission validation

## 4. Invitation Backend Logic

- [ ] 4.1 Create InvitationService with create, accept, decline, cancel, resend methods
- [ ] 4.2 Implement token generation (secure random, 48 chars)
- [ ] 4.3 Implement expiry logic (default 7 days, configurable)
- [ ] 4.4 Add duplicate invitation prevention (same workspace+email+pending)
- [ ] 4.5 Create InvitationMail notification with accept link

## 5. Laravel API Endpoints - Invitations

- [ ] 5.1 Create InvitationController with store, show (by token), accept, decline
- [ ] 5.2 POST /api/workspaces/{workspace}/invitations (create invitation)
- [ ] 5.3 GET /api/invitations/{token} (view invitation details - public)
- [ ] 5.4 POST /api/invitations/{token}/accept (accept invitation)
- [ ] 5.5 POST /api/invitations/{token}/decline (decline invitation)
- [ ] 5.6 DELETE /api/workspaces/{workspace}/invitations/{id} (cancel pending)
- [ ] 5.7 POST /api/workspaces/{workspace}/invitations/{id}/resend (resend email)
- [ ] 5.8 Create InvitationRequest validation classes

## 6. Laravel API Endpoints - Members

- [ ] 6.1 Create WorkspaceMemberController with index, update, destroy
- [ ] 6.2 GET /api/workspaces/{workspace}/members (list members + pending invites)
- [ ] 6.3 PATCH /api/workspaces/{workspace}/members/{user} (change role)
- [ ] 6.4 DELETE /api/workspaces/{workspace}/members/{user} (remove member)
- [ ] 6.5 Create MemberResource for API response formatting
- [ ] 6.6 Implement pagination and filtering for member list

## 7. Email Notifications

- [ ] 7.1 Create InvitationMail with HTML template
- [ ] 7.2 Include workspace name, inviter name, role, message, accept link
- [ ] 7.3 Queue email delivery for performance
- [ ] 7.4 Handle email delivery failures gracefully

## 8. Angular Services

- [ ] 8.1 Create InvitationService with API integration methods
- [ ] 8.2 Create WorkspaceMemberService with API integration methods
- [ ] 8.3 Add invitation types and interfaces
- [ ] 8.4 Implement permission checking helpers

## 9. Angular UI - Members Page

- [ ] 9.1 Create WorkspaceMembersComponent (route: /workspaces/{id}/members)
- [ ] 9.2 Display member list with avatar, name, email, role, status
- [ ] 9.3 Add role change dropdown (for authorized users)
- [ ] 9.4 Implement remove member with confirmation modal
- [ ] 9.5 Show pending invitations section with cancel/resend actions
- [ ] 9.6 Add loading states and error handling

## 10. Angular UI - Invite Modal

- [ ] 10.1 Create InviteMemberModalComponent
- [ ] 10.2 Add form fields: email (required), role (dropdown), message (optional)
- [ ] 10.3 Email validation and duplicate check
- [ ] 10.4 Success/error toast notifications
- [ ] 10.5 Close modal and refresh list on success

## 11. Angular UI - Accept Invitation Page

- [ ] 11.1 Create AcceptInvitationComponent (route: /invitations/{token})
- [ ] 11.2 Display invitation details (workspace name, inviter, role)
- [ ] 11.3 Handle logged-out state: show login/register options
- [ ] 11.4 Handle logged-in state: show accept/decline buttons
- [ ] 11.5 Handle expired/invalid token gracefully
- [ ] 11.6 Redirect to workspace on successful accept

## 12. Route Guards & Authorization

- [ ] 12.1 Create WorkspaceRoleGuard for route protection
- [ ] 12.2 Protect member management routes (Owner/Admin only)
- [ ] 12.3 Add permission directive for UI element visibility
- [ ] 12.4 Handle unauthorized access with appropriate redirects

## 13. Testing & Validation

- [ ] 13.1 PHPUnit tests for Invitation CRUD operations
- [ ] 13.2 PHPUnit tests for invitation accept/decline flow
- [ ] 13.3 PHPUnit tests for role-based authorization
- [ ] 13.4 PHPUnit tests for duplicate invitation prevention
- [ ] 13.5 Angular unit tests for InvitationService
- [ ] 13.6 Angular unit tests for WorkspaceMembersComponent
- [ ] 13.7 E2E test: invite → email → accept → member list
