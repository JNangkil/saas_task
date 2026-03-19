# Tasks: Add Dynamic Columns, Custom Fields & Table Interactions

## 1. Database Schema & Migrations

- [x] 1.1 Create `board_columns` table (id, board_id, name, type, options JSON, position, width, is_hidden, is_pinned, is_required, created_at, updated_at)
- [x] 1.2 Create `task_field_values` table (id, task_id, column_id, value JSON, created_at, updated_at)
- [x] 1.3 Create `user_board_preferences` table for per-user column visibility/order
- [x] 1.4 Add indexes for column lookup and filtering performance
- [x] 1.5 Create default columns seeder (Title, Status, Priority, Assignee, Due Date)

## 2. Laravel Models & Relationships

- [x] 2.1 Create BoardColumn model with type casting and options accessor
- [x] 2.2 Create TaskFieldValue model with column relationship
- [x] 2.3 Update Board model with columns relationship
- [x] 2.4 Update Task model with fieldValues relationship
- [x] 2.5 Add model factories for testing

## 3. Column Type System

- [x] 3.1 Define ColumnType enum/class with all supported types
- [x] 3.2 Implement type-specific validation rules
- [x] 3.3 Implement type-specific options schema (status colors, label options)
- [x] 3.4 Create ColumnTypeRegistry for extensibility

## 4. Laravel API Endpoints - Columns

- [x] 4.1 Create BoardColumnController with CRUD operations
- [x] 4.2 GET /api/boards/{board}/columns (list columns)
- [x] 4.3 POST /api/boards/{board}/columns (create column)
- [x] 4.4 PATCH /api/columns/{column} (update column)
- [x] 4.5 DELETE /api/columns/{column} (delete column)
- [x] 4.6 PATCH /api/boards/{board}/columns/reorder (reorder columns)
- [x] 4.7 Create BoardColumnResource for API responses

## 5. Laravel API Endpoints - Bulk Operations

- [x] 5.1 PATCH /api/boards/{board}/tasks/bulk-update (bulk field changes)
- [x] 5.2 POST /api/boards/{board}/tasks/bulk-move (move to another board)
- [x] 5.3 POST /api/boards/{board}/tasks/bulk-archive (bulk archive)
- [x] 5.4 DELETE /api/boards/{board}/tasks/bulk-delete (bulk delete)
- [x] 5.5 PATCH /api/boards/{board}/tasks/reorder (drag-drop reorder)
- [x] 5.6 Implement validation for bulk operations

## 6. Filtering System Backend

- [x] 6.1 Implement filter query builder for dynamic columns
- [x] 6.2 Support filtering on all column types
- [x] 6.3 Support compound filters (AND/OR logic)
- [x] 6.4 Store user filter presets per board
- [x] 6.5 GET /api/boards/{board}/filters (saved filters)
- [x] 6.6 POST /api/boards/{board}/filters (save filter)

## 7. Angular Column Service

- [x] 7.1 Create BoardColumnService with CRUD methods
- [x] 7.2 Implement column type definitions and metadata
- [x] 7.3 Add column reordering and preferences management
- [x] 7.4 Create column state management

## 8. Angular Column Management UI

- [x] 8.1 Create ColumnManagerDialogComponent
- [x] 8.2 Implement column list with drag-and-drop reorder
- [x] 8.3 Create AddColumnComponent (type selection wizard)
- [x] 8.4 Create EditColumnComponent (properties editor)
- [x] 8.5 Implement column type options editors (status colors, label options)
- [x] 8.6 Add hide/show column toggles

## 9. Column Header Interactions

- [x] 9.1 Implement column resize by dragging border
- [x] 9.2 Implement column reorder by dragging header
- [x] 9.3 Add pin/unpin column action
- [x] 9.4 Add column header context menu (sort, filter, hide)
- [x] 9.5 Persist column width preferences

## 10. Cell Renderer Components

- [x] 10.1 Create TextCellRendererComponent (single line, inline edit)
- [x] 10.2 Create LongTextCellRendererComponent (expandable, modal edit)
- [x] 10.3 Create StatusCellRendererComponent (colored dropdown)
- [x] 10.4 Create PriorityCellRendererComponent (colored dropdown)
- [x] 10.5 Create AssigneeCellRendererComponent (user selector with search)
- [x] 10.6 Create DateCellRendererComponent (datepicker)
- [x] 10.7 Create LabelsCellRendererComponent (multi-select chips)
- [x] 10.8 Create NumberCellRendererComponent (numeric input)
- [x] 10.9 Create CheckboxCellRendererComponent (toggle)
- [x] 10.10 Create UrlCellRendererComponent (link with preview)

## 11. Row Drag-and-Drop

- [x] 11.1 Integrate Angular CDK DragDrop module
- [x] 11.2 Implement drag handle on rows
- [x] 11.3 Create visual feedback during drag
- [x] 11.4 Implement position calculation on drop
- [x] 11.5 Sync position changes to backend
- [x] 11.6 Handle multi-row drag

## 12. Bulk Actions UI

- [x] 12.1 Create BulkActionsToolbarComponent
- [x] 12.2 Implement selection state management
- [x] 12.3 Create bulk status change UI
- [x] 12.4 Create bulk assignee change UI
- [x] 12.5 Create bulk move to board UI
- [x] 12.6 Create bulk archive/delete with confirmation
- [x] 12.7 Add "Select all" / "Clear selection" actions

## 13. Filter Builder UI

- [x] 13.1 Create FilterBuilderComponent
- [x] 13.2 Implement filter row per condition
- [x] 13.3 Support type-specific filter operators
- [x] 13.4 Add AND/OR logic toggle
- [x] 13.5 Implement quick filter presets
- [x] 13.6 Persist filter state per user/board
- [x] 13.7 Create SavedFiltersDropdownComponent

## 14. Testing & Validation

- [x] 14.1 PHPUnit tests for BoardColumn CRUD
- [x] 14.2 PHPUnit tests for bulk operations
- [x] 14.3 PHPUnit tests for dynamic column filtering
- [x] 14.4 Angular unit tests for cell renderers
- [x] 14.5 Angular unit tests for drag-and-drop
- [x] 14.6 E2E test: add column → edit task → filter → bulk update
