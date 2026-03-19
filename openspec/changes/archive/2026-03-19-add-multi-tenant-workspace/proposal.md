# Change: Add Multi-Tenant & Workspace Management

## Why

The SaaS task management system requires a multi-tenant architecture where each organization (Tenant) operates in complete isolation while supporting multiple Workspaces within each Tenant. This foundation is essential for:
- Enabling companies to manage distinct teams/projects (Marketing, Development) as separate Workspaces
- Ensuring data isolation between tenants for security and compliance
- Supporting SaaS features like per-tenant billing and subscription management
- Providing the organizational context hierarchy for boards, tasks, and user access

## What Changes

### Core Entities
- **Tenant model**: Represents a company/organization with settings (name, slug, logo, billing info, locale, timezone)
- **Workspace model**: Top-level grouping within a tenant (name, description, color, soft-delete support)
- **Pivot tables**: User-Tenant and User-Workspace associations with role information

### Backend (Laravel)
- Multi-tenant middleware that resolves tenant from subdomain, header, or JWT claim
- Global scopes ensuring all queries are tenant-isolated
- REST API endpoints for Tenant and Workspace CRUD operations
- Authorization policies ensuring users can only access their tenants/workspaces

### Frontend (Angular)
- Tenant and Workspace Angular services with RxJS state management
- Workspace selector component in the top navbar
- Workspace management UI (list, create, edit, archive/delete)
- Error handling for inactive/disabled tenants and workspaces

### Data Model Relationships
- `tenant → workspaces → boards → tasks` cascading hierarchy
- Soft delete strategy to preserve referential integrity
- Foreign keys with proper cascade rules

## Impact

### Affected Specs (New Capabilities)
- `tenant-management`: Tenant CRUD, settings, status management
- `workspace-management`: Workspace CRUD, switching, archival
- `multi-tenant-authorization`: Tenant resolution, scoping, access control
- `workspace-ui`: Angular workspace selector and management components

### Affected Code Areas
- **Database**: New migrations for tenants, workspaces, pivot tables
- **Models**: Tenant, Workspace, updated User model with tenant relationships
- **Middleware**: TenantResolution middleware, global tenant scoping
- **Controllers**: TenantController, WorkspaceController
- **Services**: TenantService, WorkspaceService (Angular)
- **Components**: WorkspaceSelectorComponent, WorkspaceManagementComponent
- **State**: Global workspace context state management

### Dependencies
- JWT claims need to include tenant_id
- Existing Board and Task models will need tenant_id and workspace_id fields
- All existing API routes need tenant context
