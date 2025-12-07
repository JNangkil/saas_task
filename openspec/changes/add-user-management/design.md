# Design: User Management, Permissions & Task Assignment

## Context

This design documents the architecture for user management, RBAC, and task assignment. The system needs clear role hierarchies at both tenant and workspace levels with enforced permissions.

**Dependencies**: Extends `add-multi-tenant-workspace`, `add-workspace-invitations`, and `add-task-table-crud`.

## Goals / Non-Goals

### Goals
- Implement comprehensive user profiles
- Define clear role hierarchies at tenant and workspace levels
- Create granular permission system
- Support primary assignee and watchers on tasks
- Trigger notifications on assignment changes

### Non-Goals
- Custom role creation (use fixed roles)
- Permission inheritance across tenants
- Anonymous/guest access
- SSO/OAuth integration (separate feature)

## Decisions

### D1: Role Hierarchy

**Decision**: Two-level role system with fixed roles.

**Tenant-Level Roles:**
| Role | Description |
|------|-------------|
| Owner | Full control, cannot be removed |
| Admin | Manage users, workspaces, settings |
| Billing | Manage subscription and payments |
| Member | Basic access to assigned workspaces |

**Workspace-Level Roles:**
| Role | Description |
|------|-------------|
| Owner | Full workspace control |
| Admin | Manage workspace, boards, members |
| Member | Create/edit tasks, boards |
| Viewer | Read-only access |

**Rationale**:
- Clear separation of tenant vs workspace concerns
- Fixed roles simplify permission logic
- Billing role for financial delegation

### D2: Permission Matrix

**Decision**: Define granular permissions mapped to roles.

**Tenant Permissions:**
| Permission | Owner | Admin | Billing | Member |
|------------|-------|-------|---------|--------|
| tenant.manage | ✓ | | | |
| tenant.users.manage | ✓ | ✓ | | |
| tenant.users.invite | ✓ | ✓ | | |
| tenant.billing.manage | ✓ | | ✓ | |
| tenant.workspaces.create | ✓ | ✓ | | |
| tenant.settings.manage | ✓ | ✓ | | |
| tenant.analytics.view | ✓ | ✓ | ✓ | |

**Workspace Permissions:**
| Permission | Owner | Admin | Member | Viewer |
|------------|-------|-------|--------|--------|
| workspace.manage | ✓ | | | |
| workspace.delete | ✓ | | | |
| workspace.members.manage | ✓ | ✓ | | |
| workspace.members.invite | ✓ | ✓ | | |
| boards.create | ✓ | ✓ | ✓ | |
| boards.manage | ✓ | ✓ | | |
| tasks.create | ✓ | ✓ | ✓ | |
| tasks.edit | ✓ | ✓ | ✓ | |
| tasks.delete | ✓ | ✓ | | |
| tasks.assign | ✓ | ✓ | ✓ | |
| tasks.view | ✓ | ✓ | ✓ | ✓ |
| columns.manage | ✓ | ✓ | | |

**Rationale**:
- Granular permissions enable fine control
- Matrix makes auditing easy
- Viewer role for stakeholders who need visibility

### D3: Permission Enforcement

**Decision**: Combine Laravel Policies with middleware.

```php
// Gate registration
Gate::define('tenant.users.manage', function (User $user, Tenant $tenant) {
    return $user->hasTenantPermission($tenant, 'tenant.users.manage');
});

// Policy method
public function manageUsers(User $user, Tenant $tenant): bool
{
    return $user->hasTenantPermission($tenant, 'tenant.users.manage');
}

// Controller usage
$this->authorize('manageUsers', $tenant);

// Middleware for routes
Route::middleware('permission:tenant.users.manage')->group(...);
```

**Rationale**:
- Policies for resource-based authorization
- Middleware for route-level checks
- Consistent permission checking throughout

### D4: Task Assignment Model

**Decision**: Single primary assignee with multiple watchers.

```
┌─────────────┐       ┌───────────────┐
│    tasks    │       │ task_watchers │
├─────────────┤       ├───────────────┤
│ id          │       │ id            │
│ assignee_id │──┐    │ task_id       │───► tasks.id
│ ...         │  │    │ user_id       │───► users.id
└─────────────┘  │    │ created_at    │
                 │    └───────────────┘
                 │
                 └────► users.id
```

**Rationale**:
- Clear accountability with single assignee
- Watchers receive notifications without ownership
- Common pattern in task management tools

### D5: User Status Management

**Decision**: Active/inactive status with cascading effects.

**Status Values:**
- `active`: Normal access
- `inactive`: Cannot login, excluded from assignments

**Deactivation Effects:**
- User cannot login
- Removed from active assignment options
- Existing assignments preserved (historical)
- User data retained

**Rationale**:
- Soft deactivation preserves data integrity
- HR/admin can suspend problematic users
- Reactivation restores full access

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex permission checks | Medium | Cache role/permissions |
| Orphaned assignments | Low | Keep inactive user on tasks |
| Notification spam | Low | User notification preferences |

## Migration Plan

### Phase 1: User Profiles
1. Extend users table
2. Implement profile API
3. Build profile UI

### Phase 2: Permissions
1. Define permission constants
2. Implement policies
3. Add middleware

### Phase 3: Assignment
1. Create task_watchers table
2. Implement assignment API
3. Build assignment UI

### Phase 4: Notifications
1. Create notification classes
2. Wire up triggers
3. Test notification flow

## Open Questions

1. **Avatar storage**: Use local storage or cloud (S3)?
   - *Proposed*: Cloud storage with CDN for avatars

2. **Email change**: Allow users to change their email?
   - *Proposed*: Require email verification for changes

3. **Watcher limit**: Maximum watchers per task?
   - *Proposed*: Soft limit of 20 watchers
