# Tasks: Add Multi-Tenant & Workspace Management

## 1. Database Schema & Migrations

- [x] 1.1 Create `tenants` table migration (id, name, slug, logo_url, billing_email, settings JSON, status, locale, timezone, created_at, updated_at)
- [x] 1.2 Create `workspaces` table migration (id, tenant_id, name, description, color, icon, is_archived, created_at, updated_at, deleted_at)
- [x] 1.3 Create `tenant_user` pivot table migration (tenant_id, user_id, role, invited_at, joined_at)
- [x] 1.4 Create `workspace_user` pivot table migration (workspace_id, user_id, role, joined_at)
- [x] 1.5 Add database indexes for performance (tenant_id, workspace_id, slug, status)
- [x] 1.6 Create foreign key constraints with appropriate cascade rules

## 2. Laravel Models

- [x] 2.1 Create Tenant model with relationships (workspaces, users, boards)
- [x] 2.2 Create Workspace model with relationships (tenant, users, boards) and soft deletes
- [x] 2.3 Update User model with tenant and workspace relationships
- [ ] 2.4 Define model factories for Tenant and Workspace

## 3. Multi-Tenant Middleware & Scoping

- [x] 3.1 Create TenantResolution middleware (resolve from subdomain → header → JWT claim)
- [ ] 3.2 Implement TenantScope global scope for automatic query filtering
- [ ] 3.3 Register middleware and scopes in service providers
- [ ] 3.4 Add tenant_id to JWT claims during authentication
- [ ] 3.5 Create helper for accessing current tenant context

## 4. Authorization & Policies

- [ ] 4.1 Create TenantPolicy (view, update, delete, manage-users)
- [ ] 4.2 Create WorkspacePolicy (view, create, update, archive, delete, manage-users)
- [ ] 4.3 Register policies in AuthServiceProvider
- [ ] 4.4 Implement role-based access within tenant (owner, admin, member, viewer)

## 5. Laravel API Endpoints - Tenants

- [x] 5.1 Create TenantController with index, show, store, update methods
- [x] 5.2 Implement tenant archive/deactivate endpoint
- [ ] 5.3 Create TenantRequest form validation classes
- [ ] 5.4 Create TenantResource for API response formatting
- [ ] 5.5 Add routes: GET/POST /api/tenants, GET/PUT/DELETE /api/tenants/{tenant}

## 6. Laravel API Endpoints - Workspaces

- [x] 6.1 Create WorkspaceController with index, show, store, update methods
- [x] 6.2 Implement workspace archive/delete endpoint (soft delete)
- [ ] 6.3 Create WorkspaceRequest form validation classes
- [ ] 6.4 Create WorkspaceResource for API response formatting
- [ ] 6.5 Add routes: GET/POST /api/tenants/{tenant}/workspaces, GET/PUT/DELETE /api/workspaces/{workspace}
- [ ] 6.6 Implement pagination and filtering for workspace listing

## 7. Angular Services

- [x] 7.1 Create TenantService with API integration methods
- [x] 7.2 Create WorkspaceService with API integration methods
- [x] 7.3 Implement workspace state management using BehaviorSubject
- [x] 7.4 Create workspace context interface and types
- [x] 7.5 Add HTTP interceptor to include tenant context in requests

## 8. Angular UI - Workspace Selector

- [x] 8.1 Create WorkspaceSelectorComponent (dropdown in navbar)
- [x] 8.2 Implement workspace switching functionality
- [x] 8.3 Persist last selected workspace (localStorage or backend)
- [x] 8.4 Handle workspace loading states and errors
- [ ] 8.5 Style selector with consistent design system

## 9. Angular UI - Workspace Management

- [x] 9.1 Create WorkspaceListComponent (list all workspaces for user)
- [x] 9.2 Create WorkspaceFormComponent (create/edit workspace)
- [ ] 9.3 Implement color/icon picker for workspace customization
- [ ] 9.4 Add archive/delete confirmation dialogs
- [ ] 9.5 Handle inactive/disabled workspace states
- [ ] 9.6 Add workspace settings page with member management

## 10. Integration & Error Handling

- [x] 10.1 Handle 403/404 responses for tenant/workspace access errors
- [x] 10.2 Add toast notifications for workspace operations
- [x] 10.3 Implement navigation guards for workspace context
- [ ] 10.4 Auto-redirect when workspace becomes inactive/deleted

## 11. Testing & Validation

- [ ] 11.1 Write PHPUnit tests for Tenant CRUD operations
- [ ] 11.2 Write PHPUnit tests for Workspace CRUD operations
- [ ] 11.3 Write PHPUnit tests for tenant isolation (cross-tenant access denied)
- [ ] 11.4 Write PHPUnit tests for authorization policies
- [ ] 11.5 Write Angular unit tests for TenantService and WorkspaceService
- [ ] 11.6 Write Angular unit tests for WorkspaceSelectorComponent
- [ ] 11.7 Manual E2E testing: create tenant → create workspace → switch workspace → archive workspace
