# Change: Add Dynamic Columns, Custom Fields & Table Interactions

## Why

The Monday.com-style task manager requires flexible, customizable columns that adapt to different workflow needs. This feature provides:
- Per-board column configuration for different project types
- Rich column types (status, date, assignee, labels, etc.) with appropriate UI controls
- Advanced table interactions (drag-and-drop, bulk actions, filtering)
- User-configurable views and layouts

This is essential for the power-user experience that differentiates professional task management tools.

## What Changes

### Column System
- **BoardColumn entity**: Per-board column definitions with type, options, position
- **TaskFieldValue entity**: Dynamic field values mapping column_id to task values
- **Column types**: Text, Long Text, Status, Priority, Assignee, Date, Labels, Number, Checkbox, URL

### Column Management
- Column CRUD operations per board
- Drag-and-drop column reordering
- Column visibility (show/hide)
- Column width and pinning preferences

### Table Interactions
- Type-specific cell renderers and editors
- Row drag-and-drop reordering
- Bulk selection and actions
- Advanced filtering with persistence

### Backend (Laravel)
- BoardColumn and TaskFieldValue models
- Column type validation and options handling
- Bulk update endpoints
- Efficient filtering on dynamic columns

### Frontend (Angular)
- Column management dialog
- Type-specific cell components
- Drag-and-drop with CDK integration
- Filter builder UI

## Impact

### Affected Specs (New Capabilities)
- `board-columns`: Column entity, API, management
- `column-types`: Type definitions, renderers, validators
- `table-interactions-ui`: Filtering, bulk actions, drag-and-drop

### Dependencies
- Requires `add-task-table-crud` (Task entity, table component)
- Extends existing task table with dynamic columns

### Affected Code Areas
- **Database**: `board_columns`, `task_field_values` tables
- **Models**: BoardColumn, TaskFieldValue, updated Board/Task
- **Controllers**: BoardColumnController, bulk action endpoints
- **Components**: ColumnManager, Cell renderers, FilterBuilder
