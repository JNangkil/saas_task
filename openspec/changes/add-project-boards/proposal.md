# Change: Add Project Boards & Board Templates

## Why

Workspaces need a way to organize tasks into multiple projects or boards. This feature provides:
- Multiple boards per workspace for different projects/teams
- Board templates for quick setup of common workflows
- Consistent structure across similar projects
- Personalization with colors, icons, and favorites

This is the organizational layer between workspaces and tasks.

## What Changes

### Board Entity
- **Board model**: Core entity with workspace relationship
- **Board types**: Standard project boards vs personal boards
- **Customization**: Name, description, color, icon
- **Archiving**: Soft archive with data preservation

### Board Templates
- **System templates**: Pre-built templates for common use cases
- **Custom templates**: Tenant-level templates from existing boards
- **Template config**: Columns, statuses, optional sample tasks
- **Template sharing**: Within tenant

### Board Management
- Board CRUD operations
- Favorite/star functionality
- Archive/restore
- Settings page

### Frontend (Angular)
- Board list view (grid and list)
- Create board modal with template selection
- Board settings page
- Favorites sidebar section

## Impact

### Affected Specs (New Capabilities)
- `board-entity`: Board data model and API
- `board-templates`: Template system
- `board-ui`: Angular components

### Dependencies
- Requires `add-multi-tenant-workspace` (Workspace entity)
- Required by `add-task-table-crud` (Tasks belong to boards)
- Required by `add-dynamic-columns` (Columns belong to boards)

### Affected Code Areas
- **Database**: `boards`, `board_templates`, `user_board_favorites` tables
- **Models**: Board, BoardTemplate
- **Controllers**: BoardController, BoardTemplateController
- **Components**: BoardListComponent, CreateBoardModal, BoardSettings
