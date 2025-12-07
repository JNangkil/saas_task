# Tasks: Add User Management, Permissions & Task Assignment

## 1. Database Schema Updates

- [ ] 1.1 Add columns to users table (job_title, timezone, locale, status, avatar_url)
- [ ] 1.2 Create task_watchers pivot table (task_id, user_id, created_at)
- [ ] 1.3 Update tenant_user pivot with tenant-level roles
- [ ] 1.4 Add indexes for user queries

## 2. User Model & Profile

- [ ] 2.1 Update User model with new attributes
- [ ] 2.2 Add timezone and locale casts
- [ ] 2.3 Create profile update validation rules
- [ ] 2.4 Add avatar storage handling

## 3. User Profile API

- [ ] 3.1 GET /api/users/me (current user profile)
- [ ] 3.2 PATCH /api/users/me (update profile)
- [ ] 3.3 POST /api/users/me/avatar (upload avatar)
- [ ] 3.4 DELETE /api/users/me/avatar (remove avatar)
- [ ] 3.5 Create UserResource for responses

## 4. Tenant User Management API

- [ ] 4.1 GET /api/tenants/{tenant}/users (list tenant users)
- [ ] 4.2 PATCH /api/tenants/{tenant}/users/{user} (update role/status)
- [ ] 4.3 DELETE /api/tenants/{tenant}/users/{user} (remove from tenant)
- [ ] 4.4 Create TenantUserResource

## 5. Permission System

- [ ] 5.1 Define Permission enum/constants
- [ ] 5.2 Create role-to-permission mappings
- [ ] 5.3 Create PermissionService for checking access
- [ ] 5.4 Create permission middleware
- [ ] 5.5 Update existing policies with permission checks

## 6. Laravel Policies

- [ ] 6.1 Create UserPolicy
- [ ] 6.2 Update TenantPolicy with user management
- [ ] 6.3 Update TaskPolicy for assignment
- [ ] 6.4 Create gate definitions for permissions

## 7. Task Assignment Backend

- [ ] 7.1 Ensure assignee_id on tasks table
- [ ] 7.2 Create TaskWatcher model
- [ ] 7.3 PATCH /api/tasks/{task}/assignee
- [ ] 7.4 GET /api/tasks/{task}/watchers
- [ ] 7.5 POST /api/tasks/{task}/watchers
- [ ] 7.6 DELETE /api/tasks/{task}/watchers/{user}

## 8. Assignment Notifications

- [ ] 8.1 Create TaskAssigned notification
- [ ] 8.2 Create TaskWatcherAdded notification
- [ ] 8.3 Fire notifications on assignment change
- [ ] 8.4 Email and in-app notification channels

## 9. Angular User Service

- [ ] 9.1 Create UserService for profile operations
- [ ] 9.2 Create TenantUserService for user management
- [ ] 9.3 Create PermissionService for frontend checks
- [ ] 9.4 Create permission directive for UI elements

## 10. User Profile Page

- [ ] 10.1 Create ProfilePageComponent
- [ ] 10.2 Profile form (name, job_title, timezone, locale)
- [ ] 10.3 Avatar upload component
- [ ] 10.4 Password change section
- [ ] 10.5 Notification preferences

## 11. Tenant User Management Page

- [ ] 11.1 Create UserManagementPageComponent
- [ ] 11.2 Users table with search and filters
- [ ] 11.3 Role change dropdown
- [ ] 11.4 Status toggle (activate/suspend)
- [ ] 11.5 Remove user action with confirmation

## 12. Assignee Selector Component

- [ ] 12.1 Create AssigneeSelectorComponent
- [ ] 12.2 Search workspace members
- [ ] 12.3 Display avatar and name
- [ ] 12.4 Handle selection and clearing
- [ ] 12.5 Integrate with task forms

## 13. Watchers Component

- [ ] 13.1 Create TaskWatchersComponent
- [ ] 13.2 Show list of current watchers
- [ ] 13.3 Add watcher button with search
- [ ] 13.4 Remove watcher action

## 14. Testing

- [ ] 14.1 PHPUnit tests for UserPolicy
- [ ] 14.2 PHPUnit tests for permission middleware
- [ ] 14.3 PHPUnit tests for assignment endpoints
- [ ] 14.4 Angular unit tests for permission directive
- [ ] 14.5 E2E test: assign task, add watcher, verify notifications
