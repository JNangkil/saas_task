## ADDED Requirements

### Requirement: Column Management Dialog
The Angular application SHALL provide a ColumnManagerDialogComponent for managing board columns.

#### Scenario: Open column manager
- **WHEN** an admin clicks "Manage Columns" on a board
- **THEN** a dialog opens showing all columns
- **AND** columns are listed with name, type, and visibility toggle

#### Scenario: Reorder columns via drag-and-drop
- **WHEN** an admin drags a column in the list
- **THEN** the column order updates visually
- **AND** on dialog close, new order is persisted

#### Scenario: Add new column
- **WHEN** an admin clicks "Add Column"
- **THEN** a type selection panel appears
- **AND** selecting a type shows configuration form
- **AND** column is created and added to board

#### Scenario: Edit column properties
- **WHEN** an admin clicks edit on a column
- **THEN** an edit form shows column name and type options
- **AND** type-specific options are configurable (e.g., status colors)

#### Scenario: Delete column with confirmation
- **WHEN** an admin clicks delete on a column
- **THEN** confirmation modal warns about data loss
- **AND** on confirm, column is deleted

---

### Requirement: Column Header Interactions
The Angular application SHALL support interactive column headers in the task table.

#### Scenario: Resize column by dragging
- **WHEN** a user drags the column border
- **THEN** column width adjusts in real-time
- **AND** on release, new width is saved to preferences

#### Scenario: Reorder column by dragging header
- **WHEN** a user drags a column header horizontally
- **THEN** the column moves to new position
- **AND** order is saved to user preferences

#### Scenario: Pin column
- **WHEN** a user right-clicks column header and selects "Pin"
- **THEN** the column moves to the left pinned area
- **AND** pinned columns don't scroll horizontally

#### Scenario: Hide column from header menu
- **WHEN** a user right-clicks column header and selects "Hide"
- **THEN** the column is hidden from view
- **AND** can be shown again from View menu

---

### Requirement: Cell Renderer Registry
The Angular application SHALL use a registry pattern for type-specific cell components.

```typescript
@Injectable()
export class CellRendererRegistry {
  private renderers: Map<string, Type<CellComponent>>;
  
  getRenderer(type: string): Type<CellComponent>;
  getEditor(type: string): Type<CellEditorComponent>;
}
```

#### Scenario: Render cell by type
- **WHEN** a cell is rendered in the table
- **THEN** the appropriate renderer component is used based on column type

#### Scenario: Inline edit by type
- **WHEN** a cell enters edit mode
- **THEN** the appropriate editor component is activated

---

### Requirement: Row Drag-and-Drop
The Angular application SHALL support drag-and-drop row reordering using Angular CDK.

#### Scenario: Drag row to new position
- **WHEN** a user drags a row by the drag handle
- **THEN** visual indicator shows insertion point
- **AND** on drop, task position is updated
- **AND** API call persists new position

#### Scenario: Multi-row drag
- **WHEN** multiple rows are selected and dragged
- **THEN** all selected rows move together
- **AND** positions are updated for all moved rows

#### Scenario: Cancel drag with escape
- **WHEN** user presses Escape during drag
- **THEN** drag operation is cancelled
- **AND** rows return to original positions

---

### Requirement: Bulk Selection
The Angular application SHALL support selecting multiple tasks for bulk operations.

#### Scenario: Select single task
- **WHEN** a user clicks a task checkbox
- **THEN** the task is added to selection
- **AND** selection count is displayed

#### Scenario: Select all visible tasks
- **WHEN** a user clicks the header checkbox
- **THEN** all visible tasks are selected
- **AND** clicking again deselects all

#### Scenario: Range selection with Shift
- **WHEN** a user Shift+clicks a second checkbox
- **THEN** all tasks between first and second are selected

---

### Requirement: Bulk Actions Toolbar
The Angular application SHALL provide a toolbar for bulk operations when tasks are selected.

#### Scenario: Display bulk actions toolbar
- **WHEN** one or more tasks are selected
- **THEN** a floating toolbar appears with:
  - Selection count
  - Change Status button
  - Change Priority button
  - Change Assignee button
  - Add Labels button
  - Move to Board button
  - Archive button
  - Delete button
  - Clear selection button

#### Scenario: Bulk change status
- **WHEN** user clicks "Change Status" and selects new status
- **THEN** all selected tasks are updated
- **AND** success toast shows count updated

---

### Requirement: Bulk API Endpoints
The system SHALL provide backend endpoints for bulk operations.

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | /api/boards/{board}/tasks/bulk-update | Update fields on multiple tasks |
| POST | /api/boards/{board}/tasks/bulk-move | Move tasks to another board |
| POST | /api/boards/{board}/tasks/bulk-archive | Archive multiple tasks |
| DELETE | /api/boards/{board}/tasks/bulk-delete | Delete multiple tasks |
| PATCH | /api/boards/{board}/tasks/reorder | Reorder multiple tasks |

**Bulk Update Request:**
```json
{
  "task_ids": ["uuid1", "uuid2", "uuid3"],
  "updates": {
    "status": "done",
    "assignee_id": "user-uuid"
  }
}
```

#### Scenario: Bulk update tasks
- **WHEN** a bulk update request is sent
- **THEN** all specified tasks are updated
- **AND** response includes success count and any failures

#### Scenario: Bulk move to board
- **WHEN** tasks are moved to another board
- **THEN** tasks are re-parented to new board
- **AND** column values are preserved where columns match

---

### Requirement: Filter Builder UI
The Angular application SHALL provide a FilterBuilderComponent for creating complex filters.

#### Scenario: Add filter condition
- **WHEN** a user clicks "Add Filter"
- **THEN** a filter row appears with:
  - Column selector (dropdown of all columns)
  - Operator selector (based on column type)
  - Value input (type-appropriate control)

#### Scenario: Type-specific operators
- **WHEN** a text column is selected
- **THEN** operators include: equals, contains, starts_with, is_empty
- **WHEN** a date column is selected
- **THEN** operators include: equals, before, after, between, is_empty

#### Scenario: Combine filters with AND/OR
- **WHEN** multiple filter conditions exist
- **THEN** user can toggle AND/OR logic between them
- **AND** filters are applied to task query

#### Scenario: Live filter preview
- **WHEN** filter conditions change
- **THEN** task list updates in real-time
- **AND** filter count shows matching tasks

---

### Requirement: Filter Persistence
The system SHALL persist filter preferences per user per board.

#### Scenario: Save filter as preset
- **WHEN** a user clicks "Save Filter"
- **THEN** modal asks for filter name
- **AND** filter is saved to user preferences

#### Scenario: Load saved filter
- **WHEN** a user selects a saved filter from dropdown
- **THEN** filter conditions are applied
- **AND** task list updates accordingly

#### Scenario: Clear filters
- **WHEN** a user clicks "Clear Filters"
- **THEN** all filter conditions are removed
- **AND** full task list is shown

---

### Requirement: Quick Filter Bar
The Angular application SHALL provide a quick filter bar above the task table.

#### Scenario: Quick filter components
- **WHEN** the task table is displayed
- **THEN** a quick filter bar shows:
  - Search text input
  - Status filter dropdown
  - Assignee filter dropdown
  - Due date quick options (Today, This Week, Overdue)

#### Scenario: Search filter
- **WHEN** user types in search input
- **THEN** tasks are filtered by title/description match
- **AND** debounce prevents excessive API calls

#### Scenario: Combine quick filters
- **WHEN** multiple quick filters are active
- **THEN** they combine with AND logic
- **AND** active filter chips show current filters

---

### Requirement: Server-Side Filtering
The system SHALL support server-side filtering for dynamic columns.

**Filter Query Parameters:**
```
GET /api/boards/{board}/tasks?filters=[
  {"column_id": "uuid", "operator": "equals", "value": "done"},
  {"column_id": "uuid", "operator": "after", "value": "2024-01-01"}
]&filter_logic=and
```

#### Scenario: Filter by dynamic column
- **WHEN** filtering by a custom column
- **THEN** query uses JSON operators appropriate to database
- **AND** results include only matching tasks

#### Scenario: Filter performance
- **WHEN** filtering large task sets
- **THEN** indexes on task_field_values are used
- **AND** response time remains under 500ms

---

### Requirement: Angular Column Service
The Angular application SHALL provide a BoardColumnService for column operations.

```typescript
interface IBoardColumn {
  id: string;
  board_id: string;
  name: string;
  type: ColumnType;
  options: Record<string, any>;
  position: number;
  width: number;
  is_hidden: boolean;
  is_pinned: boolean;
  is_required: boolean;
}

type ColumnType = 
  | 'text' | 'long_text' | 'status' | 'priority'
  | 'user' | 'date' | 'labels' | 'number' 
  | 'checkbox' | 'url';
```

#### Scenario: BoardColumnService methods
- **WHEN** the service is used
- **THEN** it provides:
  - getColumns(boardId): Observable<IBoardColumn[]>
  - createColumn(boardId, data): Observable<IBoardColumn>
  - updateColumn(columnId, data): Observable<IBoardColumn>
  - deleteColumn(columnId): Observable<void>
  - reorderColumns(boardId, columnIds): Observable<void>
  - getColumnTypes(): ColumnTypeDefinition[]

---

### Requirement: Angular Filter Service
The Angular application SHALL provide a FilterService for managing filters.

```typescript
interface IFilterCondition {
  column_id: string;
  operator: string;
  value: any;
}

interface ISavedFilter {
  id: string;
  name: string;
  conditions: IFilterCondition[];
  logic: 'and' | 'or';
}
```

#### Scenario: FilterService methods
- **WHEN** the service is used
- **THEN** it provides:
  - applyFilters(boardId, conditions, logic): Observable<ITask[]>
  - saveFilter(boardId, name, conditions, logic): Observable<ISavedFilter>
  - getSavedFilters(boardId): Observable<ISavedFilter[]>
  - deleteFilter(filterId): Observable<void>
