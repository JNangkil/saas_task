# Change: Add Task Table & Task CRUD

## Why

The core functionality of the SaaS task manager is managing tasks within boards. This feature provides:
- A Monday.com-style task table interface with inline editing
- Full CRUD operations for tasks with soft delete/archive support
- Flexible custom fields for different workflow needs
- High-performance filtering, sorting, and pagination for large boards

This is the primary user-facing feature that drives daily productivity.

## What Changes

### Task Entity
- **Task model**: Core entity with standard fields (title, status, priority, dates, assignee)
- **Custom fields**: Flexible JSON storage or normalized task_custom_values table
- **Position tracking**: Order index for drag-and-drop reordering

### Backend (Laravel)
- Task model with relationships to Board, Workspace, Tenant, User
- TaskController with full CRUD + archive/duplicate operations
- Filtering, sorting, and search on API endpoints
- Validation via Form Request classes

### Frontend (Angular)
- Task table component with inline editing
- Task details side panel with rich UI
- Task service with optimistic updates
- State management for selection and editing

## Impact

### Affected Specs (New Capabilities)
- `task-entity`: Data model, relationships, custom fields
- `task-api`: REST endpoints, filtering, validation
- `task-table-ui`: Angular table, inline editing, side panel

### Dependencies
- Requires `add-multi-tenant-workspace` (Workspace, Board entities)
- Requires `add-workspace-invitations` (roles for authorization)

### Affected Code Areas
- **Database**: New `tasks`, `task_custom_values` tables
- **Models**: Task, TaskCustomValue
- **Controllers**: TaskController
- **Services**: TaskService (Angular)
- **Components**: TaskTableComponent, TaskDetailsPanel, TaskRowComponent
