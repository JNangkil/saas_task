# Design: Multi-Tenant & Workspace Management

## Context

This design documents the technical architecture for implementing multi-tenancy in the SaaS task management system. The system must support:
- Complete data isolation between tenants (organizations)
- Multiple workspaces within each tenant
- Users belonging to multiple tenants and workspaces
- Scalable performance with 10,000+ tasks per tenant

**Stakeholders**: Backend developers, frontend developers, DevOps, security team

## Goals / Non-Goals

### Goals
- Implement single-database multi-tenant architecture with row-level isolation
- Provide automatic tenant scoping for all database queries
- Support flexible tenant resolution (subdomain, header, JWT)
- Enable workspace switching without page reload
- Maintain referential integrity with soft deletes

### Non-Goals
- Database-per-tenant isolation (out of scope for this phase)
- Real-time notifications for workspace changes (separate feature)
- Tenant/workspace billing integration (separate feature)
- SSO/SAML authentication per tenant (separate feature)

## Decisions

### D1: Single-Database Multi-Tenancy with Row-Level Isolation

**Decision**: Use a single database with `tenant_id` column on all tenant-scoped tables.

**Rationale**:
- Simpler deployment and maintenance
- Lower infrastructure costs
- Easier migrations and updates
- Sufficient isolation with proper middleware

**Alternatives Considered**:
- Database-per-tenant: Higher isolation but complex management, reserved for enterprise tier
- Schema-per-tenant: Middle ground but PostgreSQL-specific, limits database choice

### D2: Tenant Resolution Strategy

**Decision**: Resolve tenant in order of priority: subdomain → X-Tenant-ID header → JWT claim

```
Priority Order:
1. Subdomain: acme.taskapp.com → tenant: acme
2. Header: X-Tenant-ID: uuid → tenant lookup
3. JWT Claim: tenant_id in token payload
```

**Rationale**:
- Subdomain provides clean URLs and SEO benefits
- Header supports API-only clients and testing
- JWT fallback ensures context is always available

### D3: Global Tenant Scope Implementation

**Decision**: Use Laravel Global Scopes applied automatically via a trait.

```php
// Trait applied to all tenant-scoped models
trait BelongsToTenant
{
    protected static function bootBelongsToTenant()
    {
        static::addGlobalScope(new TenantScope);
        static::creating(fn ($model) => $model->tenant_id = tenant()?->id);
    }
}
```

**Rationale**:
- Prevents accidental cross-tenant data leaks
- Automatic tenant_id assignment on create
- Can be bypassed with `withoutGlobalScope()` for admin operations

### D4: Workspace Context Management (Angular)

**Decision**: Use a centralized WorkspaceContextService with BehaviorSubject.

```typescript
@Injectable({ providedIn: 'root' })
export class WorkspaceContextService {
    private currentWorkspace$ = new BehaviorSubject<IWorkspace | null>(null);
    
    setWorkspace(workspace: IWorkspace): void {
        this.currentWorkspace$.next(workspace);
        localStorage.setItem('lastWorkspaceId', workspace.id);
        this.refreshDependentData();
    }
}
```

**Rationale**:
- Single source of truth for workspace context
- Reactive updates to dependent components
- Persists last workspace for session continuity

**Alternatives Considered**:
- NgRx Store: More boilerplate, reserved for complex state needs
- Route params: Would require reload, defeats SPA benefits

### D5: Soft Delete Strategy

**Decision**: Use Laravel SoftDeletes for Workspaces; cascade behavior via middleware.

| Entity    | Delete Action        | Related Entities                 |
|-----------|----------------------|----------------------------------|
| Tenant    | Soft delete (deactivate) | Workspaces become inaccessible |
| Workspace | Soft delete (archive)    | Boards/Tasks remain but filtered |
| Board     | Soft delete              | Tasks remain but filtered        |
| Task      | Soft delete              | None                             |

**Rationale**:
- Preserves audit trail and recovery options
- Prevents orphaned records and broken references
- Archived workspaces can be restored

### D6: Database Schema

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   tenants   │     │   tenant_user    │     │     users       │
├─────────────┤     ├──────────────────┤     ├─────────────────┤
│ id (PK)     │◄────│ tenant_id (FK)   │     │ id (PK)         │
│ name        │     │ user_id (FK)     │────►│ email           │
│ slug        │     │ role             │     │ ...             │
│ logo_url    │     │ joined_at        │     └─────────────────┘
│ status      │     └──────────────────┘              │
│ settings    │                                       │
│ locale      │     ┌──────────────────┐              │
│ timezone    │     │ workspace_user   │              │
└──────┬──────┘     ├──────────────────┤              │
       │            │ workspace_id (FK)│              │
       │            │ user_id (FK)     │──────────────┘
       ▼            │ role             │
┌─────────────┐     │ joined_at        │
│ workspaces  │     └──────────────────┘
├─────────────┤              ▲
│ id (PK)     │──────────────┘
│ tenant_id   │
│ name        │
│ description │
│ color       │
│ icon        │
│ is_archived │
│ deleted_at  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   boards    │
├─────────────┤
│ id (PK)     │
│ workspace_id│
│ tenant_id   │ (denormalized for query performance)
│ name        │
│ ...         │
└─────────────┘
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cross-tenant data leak | Critical | Global scopes + automated tests |
| Performance at scale | Medium | Proper indexing, query optimization |
| Workspace switch latency | Low | Preload essential data, lazy load rest |
| Orphaned records | Low | Soft deletes, no hard cascades |

## Migration Plan

### Phase 1: Database Setup
1. Run migrations for tenants, workspaces, pivot tables
2. Create seed data for development/testing

### Phase 2: Backend Implementation
1. Implement models and relationships
2. Add middleware and global scopes
3. Create API endpoints with tests

### Phase 3: Frontend Integration
1. Create services and state management
2. Build UI components
3. Integration testing

### Rollback Strategy
- Migrations include `down()` methods
- Feature flag for tenant middleware
- Existing routes continue to work without tenant context initially

## Open Questions

1. **Default Workspace Creation**: Should a default workspace be auto-created when a tenant is created?
   - *Proposed*: Yes, create "General" workspace on tenant creation

2. **User Default Tenant/Workspace**: How to determine default when user belongs to multiple?
   - *Proposed*: Last accessed, stored in localStorage + user preferences

3. **Workspace Member Limits**: Should there be a limit on workspace members per subscription tier?
   - *Proposed*: Defer to billing/subscription feature
