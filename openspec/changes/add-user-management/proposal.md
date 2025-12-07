# Change: Add User Management, Permissions & Task Assignment

## Why

A complete task management system requires robust user management with:
- User profiles with personalization (avatar, timezone, locale)
- Clear role-based permissions at tenant and workspace levels
- Task assignment with primary assignee and watchers
- Notifications when assignments change

This establishes the foundation for collaboration and access control.

## What Changes

### User Profiles
- Extended user attributes (job_title, timezone, locale)
- Profile management UI
- Avatar upload/management

### Role-Based Access Control
- Tenant-level roles: Owner, Admin, Billing, Member
- Workspace-level roles: Owner, Admin, Member, Viewer
- Permission matrix with granular capabilities
- Policy enforcement on all endpoints

### Task Assignment
- Primary assignee field on tasks
- Task watchers for notifications
- Assignee selector component with search
- Assignment change notifications

### UI Components
- Tenant user management page
- User profile page
- Assignee selector component
- User avatar component

## Impact

### Affected Specs (New Capabilities)
- `user-profiles`: User entity, profile API
- `rbac-permissions`: Roles, permissions, policies
- `task-assignment`: Assignee, watchers, notifications

### Dependencies
- Extends `add-multi-tenant-workspace` (tenant_user pivot)
- Extends `add-workspace-invitations` (workspace roles)
- Extends `add-task-table-crud` (Task entity)

### Affected Code Areas
- **Database**: users table extensions, task_watchers table
- **Models**: User, Policy classes
- **Middleware**: Permission middleware
- **Components**: UserManagement, ProfilePage, AssigneeSelector
