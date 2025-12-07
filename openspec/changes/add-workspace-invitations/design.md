# Design: Workspace Invitations & User Roles

## Context

This design documents the technical architecture for implementing workspace-level role management and invitation system. The system must support:
- Flexible role-based access control within workspaces
- Secure invitation workflow with token-based acceptance
- Email notifications for invitations
- Both new and existing user onboarding flows

**Dependencies**: Requires `add-multi-tenant-workspace` change for Workspace entity.

## Goals / Non-Goals

### Goals
- Implement four-tier role system (Owner, Admin, Member, Viewer)
- Provide secure token-based invitation with configurable expiry
- Support both new user registration and existing user acceptance flows
- Enable self-service member management by authorized roles
- Maintain audit trail for all access control changes

### Non-Goals
- Team/group-based permissions (future feature)
- External identity provider integration (SAML/SCIM)
- Bulk invitation via CSV upload (future enhancement)
- Custom role creation (fixed roles only)

## Decisions

### D1: Role Permission Matrix

**Decision**: Use a fixed four-role system with predefined permissions.

| Permission | Owner | Admin | Member | Viewer |
|------------|:-----:|:-----:|:------:|:------:|
| workspace.update | ✓ | ✓ | - | - |
| workspace.archive | ✓ | - | - | - |
| workspace.delete | ✓ | - | - | - |
| boards.create | ✓ | ✓ | ✓ | - |
| boards.update | ✓ | ✓ | ✓ | - |
| boards.delete | ✓ | ✓ | - | - |
| tasks.create | ✓ | ✓ | ✓ | - |
| tasks.update | ✓ | ✓ | ✓ | - |
| tasks.delete | ✓ | ✓ | ✓ | - |
| tasks.move | ✓ | ✓ | ✓ | - |
| members.view | ✓ | ✓ | ✓ | ✓ |
| members.invite | ✓ | ✓ | - | - |
| members.remove | ✓ | ✓ | - | - |
| members.change_role | ✓ | ✓ | - | - |
| analytics.view | ✓ | ✓ | ✓ | ✓ |
| analytics.export | ✓ | ✓ | - | - |

**Rationale**:
- Simple to understand and implement
- Covers common team collaboration patterns
- Can be extended to custom roles in future

### D2: Invitation Token Strategy

**Decision**: Use cryptographically secure random tokens with configurable expiry.

```php
// Token generation
$token = Str::random(48); // 48 alphanumeric characters
$expiresAt = now()->addDays(config('invitations.expiry_days', 7));
```

**Rationale**:
- 48-char alphanumeric ≈ 285 bits of entropy (highly secure)
- Configurable expiry allows flexibility
- Token stored hashed for additional security (optional)

### D3: Invitation State Machine

**Decision**: Use explicit state transitions with validation.

```
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   accepted    │  │   declined    │  │   cancelled   │
└───────────────┘  └───────────────┘  └───────────────┘
        
Automatic transition:
pending → expired (when expires_at < now())
```

**Valid Transitions**:
- `pending` → `accepted` (user action)
- `pending` → `declined` (user action)
- `pending` → `cancelled` (admin action)
- `pending` → `expired` (time-based, virtual state)

### D4: New User Invitation Flow

**Decision**: Allow invitation viewing without auth, require auth for action.

```
1. Email received with link /invitations/{token}
2. Page loads invitation details (public endpoint)
3. User sees: "You've been invited to {workspace} as {role}"
4. If not logged in:
   a. Show "Create Account" and "Log In" buttons
   b. After auth, redirect back to invitation page
5. If logged in:
   a. Verify email matches invitation (or allow any for flexibility)
   b. Show Accept/Decline buttons
6. On Accept:
   a. Create workspace_user record
   b. Mark invitation as accepted
   c. Redirect to workspace
```

**Rationale**:
- Allows previewing invitation without account
- Seamless flow for existing users
- Clear path for new users

### D5: Duplicate Invitation Prevention

**Decision**: Prevent multiple active invitations to same workspace+email.

```php
// Validation rule
'email' => [
    'required',
    'email',
    Rule::unique('invitations')
        ->where('workspace_id', $workspaceId)
        ->where('status', 'pending')
]
```

**Scenarios**:
- Same email, pending invitation exists → Error: "Invitation already sent"
- Same email, expired invitation exists → Allow new invitation
- Same email, accepted → Error: "User is already a member"

### D6: Database Schema

```
┌──────────────────┐           ┌──────────────────┐
│   invitations    │           │  workspace_user  │
├──────────────────┤           ├──────────────────┤
│ id (PK)          │           │ workspace_id (FK)│
│ workspace_id (FK)│───────┐   │ user_id (FK)     │
│ tenant_id (FK)   │       │   │ role             │
│ email            │       │   │ status           │
│ role             │       └──►│ invited_by (FK)  │
│ token (unique)   │           │ joined_at        │
│ message          │           │ created_at       │
│ invited_by (FK)  │           └──────────────────┘
│ expires_at       │
│ status           │
│ accepted_at      │
│ created_at       │
│ updated_at       │
└──────────────────┘
```

**Indexes**:
- `invitations.token` - unique, for fast lookup
- `invitations(workspace_id, email, status)` - for duplicate check
- `workspace_user(workspace_id, user_id)` - composite primary key

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token brute-force | Critical | 48-char token = infeasible; rate limiting |
| Email deliverability | Medium | Queue with retry; show resend option |
| Role escalation | Critical | Server-side validation; only owner can create admin |
| Orphaned invitations | Low | Scheduled cleanup of expired invitations |

## Migration Plan

### Phase 1: Database & Models
1. Add migrations for invitations table
2. Update workspace_user pivot with role/status
3. Create Invitation model

### Phase 2: Backend API
1. Implement InvitationController
2. Implement WorkspaceMemberController
3. Create email templates

### Phase 3: Frontend
1. Create member management UI
2. Create invitation modal
3. Create accept invitation page

### Rollback Strategy
- Migrations include `down()` methods
- Invitations feature can be disabled via config
- Existing workspace_user records remain valid

## Open Questions

1. **Email mismatch on accept**: Should we allow any logged-in user to accept, or require email match?
   - *Proposed*: Require email match for security, show "login with correct account" if mismatch

2. **Invitation resend cooldown**: Should there be a minimum time between resends?
   - *Proposed*: 5-minute cooldown to prevent spam

3. **Owner transfer**: How to handle ownership transfer?
   - *Proposed*: Defer to separate feature; for now, workspace creator is permanent owner
