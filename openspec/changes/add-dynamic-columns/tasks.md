# Tasks: Add Dynamic Columns, Custom Fields & Table Interactions

## 1. Database Schema & Migrations

- [ ] 1.1 Create `board_columns` table (id, board_id, name, type, options JSON, position, width, is_hidden, is_pinned, is_required, created_at, updated_at)
- [ ] 1.2 Create `task_field_values` table (id, task_id, column_id, value JSON, created_at, updated_at)
- [ ] 1.3 Create `user_board_preferences` table for per-user column visibility/order
- [ ] 1.4 Add indexes for column lookup and filtering performance
- [ ] 1.5 Create default columns seeder (Title, Status, Priority, Assignee, Due Date)

## 2. Laravel Models & Relationships

- [ ] 2.1 Create BoardColumn model with type casting and options accessor
- [ ] 2.2 Create TaskFieldValue model with column relationship
- [ ] 2.3 Update Board model with columns relationship
- [ ] 2.4 Update Task model with fieldValues relationship
- [ ] 2.5 Add model factories for testing

## 3. Column Type System

- [ ] 3.1 Define ColumnType enum/class with all supported types
- [ ] 3.2 Implement type-specific validation rules
- [ ] 3.3 Implement type-specific options schema (status colors, label options)
- [ ] 3.4 Create ColumnTypeRegistry for extensibility

## 4. Laravel API Endpoints - Columns

- [ ] 4.1 Create BoardColumnController with CRUD operations
- [ ] 4.2 GET /api/boards/{board}/columns (list columns)
- [ ] 4.3 POST /api/boards/{board}/columns (create column)
- [ ] 4.4 PATCH /api/columns/{column} (update column)
- [ ] 4.5 DELETE /api/columns/{column} (delete column)
- [ ] 4.6 PATCH /api/boards/{board}/columns/reorder (reorder columns)
- [ ] 4.7 Create BoardColumnResource for API responses

## 5. Laravel API Endpoints - Bulk Operations

- [ ] 5.1 PATCH /api/boards/{board}/tasks/bulk-update (bulk field changes)
- [ ] 5.2 POST /api/boards/{board}/tasks/bulk-move (move to another board)
- [ ] 5.3 POST /api/boards/{board}/tasks/bulk-archive (bulk archive)
- [ ] 5.4 DELETE /api/boards/{board}/tasks/bulk-delete (bulk delete)
- [ ] 5.5 PATCH /api/boards/{board}/tasks/reorder (drag-drop reorder)
- [ ] 5.6 Implement validation for bulk operations

## 6. Filtering System Backend

- [ ] 6.1 Implement filter query builder for dynamic columns
- [ ] 6.2 Support filtering on all column types
- [ ] 6.3 Support compound filters (AND/OR logic)
- [ ] 6.4 Store user filter presets per board
- [ ] 6.5 GET /api/boards/{board}/filters (saved filters)
- [ ] 6.6 POST /api/boards/{board}/filters (save filter)

## 7. Angular Column Service

- [ ] 7.1 Create BoardColumnService with CRUD methods
- [ ] 7.2 Implement column type definitions and metadata
- [ ] 7.3 Add column reordering and preferences management
- [ ] 7.4 Create column state management

## 8. Angular Column Management UI

- [ ] 8.1 Create ColumnManagerDialogComponent
- [ ] 8.2 Implement column list with drag-and-drop reorder
- [ ] 8.3 Create AddColumnComponent (type selection wizard)
- [ ] 8.4 Create EditColumnComponent (properties editor)
- [ ] 8.5 Implement column type options editors (status colors, label options)
- [ ] 8.6 Add hide/show column toggles

## 9. Column Header Interactions

- [ ] 9.1 Implement column resize by dragging border
- [ ] 9.2 Implement column reorder by dragging header
- [ ] 9.3 Add pin/unpin column action
- [ ] 9.4 Add column header context menu (sort, filter, hide)
- [ ] 9.5 Persist column width preferences

## 10. Cell Renderer Components

- [ ] 10.1 Create TextCellComponent (single line, inline edit)
- [ ] 10.2 Create LongTextCellComponent (expandable, modal edit)
- [ ] 10.3 Create StatusCellComponent (colored dropdown)
- [ ] 10.4 Create PriorityCellComponent (colored dropdown)
- [ ] 10.5 Create AssigneeCellComponent (user selector with search)
- [ ] 10.6 Create DateCellComponent (datepicker)
- [ ] 10.7 Create LabelsCellComponent (multi-select chips)
- [ ] 10.8 Create NumberCellComponent (numeric input)
- [ ] 10.9 Create CheckboxCellComponent (toggle)
- [ ] 10.10 Create UrlCellComponent (link with preview)

## 11. Row Drag-and-Drop

- [ ] 11.1 Integrate Angular CDK DragDrop module
- [ ] 11.2 Implement drag handle on rows
- [ ] 11.3 Create visual feedback during drag
- [ ] 11.4 Implement position calculation on drop
- [ ] 11.5 Sync position changes to backend
- [ ] 11.6 Handle multi-row drag

## 12. Bulk Actions UI

- [ ] 12.1 Create BulkActionsToolbarComponent
- [ ] 12.2 Implement selection state management
- [ ] 12.3 Create bulk status change UI
- [ ] 12.4 Create bulk assignee change UI
- [ ] 12.5 Create bulk move to board UI
- [ ] 12.6 Create bulk archive/delete with confirmation
- [ ] 12.7 Add "Select all" / "Clear selection" actions

## 13. Filter Builder UI

- [ ] 13.1 Create FilterBuilderComponent
- [ ] 13.2 Implement filter row per condition
- [ ] 13.3 Support type-specific filter operators
- [ ] 13.4 Add AND/OR logic toggle
- [ ] 13.5 Implement quick filter presets
- [ ] 13.6 Persist filter state per user/board
- [ ] 13.7 Create SavedFiltersDropdownComponent

## 14. Testing & Validation

- [ ] 14.1 PHPUnit tests for BoardColumn CRUD
- [ ] 14.2 PHPUnit tests for bulk operations
- [ ] 14.3 PHPUnit tests for dynamic column filtering
- [ ] 14.4 Angular unit tests for cell renderers
- [ ] 14.5 Angular unit tests for drag-and-drop
- [ ] 14.6 E2E test: add column → edit task → filter → bulk update
