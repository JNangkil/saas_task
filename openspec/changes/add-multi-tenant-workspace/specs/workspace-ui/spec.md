## ADDED Requirements

### Requirement: Workspace Selector Component
The Angular application SHALL provide a WorkspaceSelectorComponent displayed in the top navbar that allows users to switch between their workspaces.

#### Scenario: Display workspace selector
- **WHEN** an authenticated user views any page
- **THEN** the navbar displays a workspace selector dropdown
- **AND** the currently selected workspace name and color are visible
- **AND** a dropdown icon indicates more options are available

#### Scenario: Open workspace selector dropdown
- **WHEN** a user clicks the workspace selector
- **THEN** a dropdown menu appears showing all accessible workspaces
- **AND** each workspace shows its name, color indicator, and icon
- **AND** the current workspace is visually highlighted

#### Scenario: Switch to different workspace
- **WHEN** a user selects a different workspace from the dropdown
- **THEN** the global workspace context updates to the selected workspace
- **AND** the page content refreshes to show boards/tasks from the new workspace
- **AND** the selected workspace ID is persisted in localStorage

#### Scenario: Show workspace count indicator
- **WHEN** a user belongs to multiple workspaces
- **THEN** the selector displays a count badge (e.g., "3 workspaces")

---

### Requirement: Workspace Angular Service
The Angular application SHALL provide a WorkspaceService for API integration and state management.

```typescript
interface IWorkspace {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}
```

#### Scenario: Fetch user's workspaces
- **WHEN** the service calls getWorkspaces()
- **THEN** it returns an Observable of paginated workspaces from GET /api/tenants/{tenant}/workspaces
- **AND** handles loading states appropriately

#### Scenario: Create new workspace
- **WHEN** the service calls createWorkspace(data)
- **THEN** it sends POST request to /api/tenants/{tenant}/workspaces
- **AND** returns the created workspace
- **AND** updates the local workspace list

#### Scenario: Update workspace
- **WHEN** the service calls updateWorkspace(id, data)
- **THEN** it sends PUT request to /api/workspaces/{id}
- **AND** returns the updated workspace

#### Scenario: Archive workspace
- **WHEN** the service calls archiveWorkspace(id)
- **THEN** it sends POST request to /api/workspaces/{id}/archive
- **AND** updates the workspace's is_archived status locally

---

### Requirement: Workspace Context State Management
The Angular application SHALL manage global workspace context using a centralized service with reactive state.

#### Scenario: Initialize workspace context on login
- **WHEN** a user logs in successfully
- **THEN** the system loads the user's workspaces
- **AND** sets the current workspace from localStorage or uses the default

#### Scenario: Reactive workspace context updates
- **WHEN** the current workspace changes
- **THEN** all subscribed components receive the updated workspace
- **AND** workspace-dependent data (boards, tasks) is refreshed

#### Scenario: Persist workspace selection
- **WHEN** a user selects a workspace
- **THEN** the workspace ID is saved to localStorage with key 'lastWorkspaceId'
- **AND** on next login, this workspace is selected by default

---

### Requirement: Tenant Angular Service
The Angular application SHALL provide a TenantService for tenant operations.

```typescript
interface ITenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  status: 'active' | 'suspended' | 'deactivated';
  settings?: Record<string, any>;
  locale?: string;
  timezone?: string;
}
```

#### Scenario: Fetch user's tenants
- **WHEN** the service calls getTenants()
- **THEN** it returns an Observable of tenants from GET /api/tenants

#### Scenario: Get current tenant details
- **WHEN** the service calls getTenant(id)
- **THEN** it returns the tenant details from GET /api/tenants/{id}

---

### Requirement: Workspace Management UI
The Angular application SHALL provide UI components for workspace CRUD operations.

#### Scenario: Display workspace list
- **WHEN** a user navigates to the workspace management page
- **THEN** they see a list of all their workspaces
- **AND** each workspace shows name, description, color, member count
- **AND** archived workspaces are visually distinct or hidden

#### Scenario: Create workspace form
- **WHEN** a user clicks "Create Workspace"
- **THEN** a form/modal appears with fields for name, description, color, and icon
- **AND** the color field provides a color picker
- **AND** the form validates required fields before submission

#### Scenario: Edit workspace
- **WHEN** a user clicks edit on a workspace
- **THEN** a form appears pre-populated with current values
- **AND** changes are saved on form submission

#### Scenario: Archive workspace confirmation
- **WHEN** a user clicks "Archive" on a workspace
- **THEN** a confirmation dialog appears warning about the action
- **AND** the dialog explains that boards and tasks will become inaccessible
- **AND** the user must confirm before archiving proceeds

#### Scenario: Delete workspace confirmation
- **WHEN** a user clicks "Delete" on a workspace
- **THEN** a confirmation dialog appears with a stronger warning
- **AND** may require typing the workspace name to confirm
- **AND** only completes after explicit confirmation

---

### Requirement: Workspace Error Handling
The Angular application SHALL handle workspace-related errors gracefully.

#### Scenario: Handle inactive workspace access
- **WHEN** a user attempts to access an archived or deleted workspace
- **THEN** the system displays an appropriate error message
- **AND** redirects the user to the workspace list or default workspace

#### Scenario: Handle tenant disabled
- **WHEN** a user's tenant becomes inactive while they are logged in
- **THEN** the system displays a notification about tenant status
- **AND** prevents further actions until the issue is resolved

#### Scenario: Handle API errors
- **WHEN** a workspace API call fails
- **THEN** a toast notification displays the error message
- **AND** the UI returns to a consistent state

---

### Requirement: HTTP Interceptor for Tenant Context
The Angular application SHALL include an HTTP interceptor that adds tenant context to requests.

#### Scenario: Add tenant header to requests
- **WHEN** an HTTP request is made to the API
- **THEN** the interceptor adds X-Tenant-ID header with current tenant ID
- **AND** the current workspace_id may be included as a query parameter when relevant

#### Scenario: Handle 403 tenant errors
- **WHEN** the API returns 403 with tenant-related error
- **THEN** the interceptor triggers a tenant context refresh
- **AND** may prompt the user to re-authenticate or select a valid tenant
