# Design: Dynamic Columns, Custom Fields & Table Interactions

## Context

This design documents the architecture for Monday.com-style dynamic columns and advanced table interactions. The system must support:
- Per-board column configuration with different types
- Rich cell editors for each column type
- Efficient storage and querying of dynamic field values
- Smooth drag-and-drop and bulk operations

**Dependencies**: Extends `add-task-table-crud` (Task entity and table component).

## Goals / Non-Goals

### Goals
- Implement extensible column type system
- Provide per-board column customization
- Enable efficient filtering on dynamic columns
- Support smooth drag-and-drop interactions
- Persist user preferences (column order, width, visibility)

### Non-Goals
- Formula columns with calculations (future)
- Column dependencies/automations (future)
- Cross-board column templates (future)
- Real-time collaborative editing (separate feature)

## Decisions

### D1: Column Storage Architecture

**Decision**: Store column definitions separately from task values.

```
┌─────────────────┐     ┌────────────────────┐
│  board_columns  │     │  task_field_values │
├─────────────────┤     ├────────────────────┤
│ id              │◄────│ column_id          │
│ board_id        │     │ task_id            │
│ name            │     │ value (JSON)       │
│ type            │     └────────────────────┘
│ options (JSON)  │
│ position        │
│ width           │
│ is_hidden       │
│ is_pinned       │
└─────────────────┘
```

**Rationale**:
- Separates schema from data
- Allows column changes without migrating task data
- Enables efficient column-level queries
- JSON value supports all types uniformly

### D2: Column Type Registry

**Decision**: Define column types with metadata, validators, and renderers.

```typescript
interface ColumnTypeDefinition {
  type: string;                    // 'status', 'date', 'user', etc.
  label: string;                   // Display name
  icon: string;                    // Column type icon
  defaultOptions: object;          // Default type options
  optionsSchema: JSONSchema;       // Options validation
  valueSchema: JSONSchema;         // Value validation
  component: Type<CellComponent>;  // Angular component
  filterOperators: string[];       // Supported filter ops
}

const COLUMN_TYPES: ColumnTypeDefinition[] = [
  { type: 'text', label: 'Text', ... },
  { type: 'long_text', label: 'Long Text', ... },
  { type: 'status', label: 'Status', ... },
  { type: 'priority', label: 'Priority', ... },
  { type: 'user', label: 'Assignee', ... },
  { type: 'date', label: 'Date', ... },
  { type: 'labels', label: 'Labels', ... },
  { type: 'number', label: 'Number', ... },
  { type: 'checkbox', label: 'Checkbox', ... },
  { type: 'url', label: 'URL', ... },
];
```

**Rationale**:
- Single source of truth for type behavior
- Easy to add new types
- Consistent validation and rendering

### D3: Value Storage Format

**Decision**: Store values as typed JSON objects.

```json
// Text
{"value": "Hello world"}

// Status
{"value": "in_progress", "label": "In Progress", "color": "#3B82F6"}

// Date
{"value": "2024-03-15", "formatted": "Mar 15, 2024"}

// User (Assignee)
{"value": "user-uuid", "name": "John Doe", "avatar": "..."}

// Labels (multi-select)
{"value": ["label-1", "label-2"], "labels": [{"id": "...", "name": "...", "color": "..."}]}

// Number
{"value": 1500, "formatted": "$1,500.00"}

// Checkbox
{"value": true}

// URL
{"value": "https://example.com", "title": "Example Site"}
```

**Rationale**:
- Type-specific structure for display
- Denormalized for read performance
- Searchable via JSON queries

### D4: Filter Query Building

**Decision**: Build dynamic WHERE clauses using JSON column operators.

```php
// MySQL JSON query for filtering
$query->whereRaw("JSON_EXTRACT(value, '$.value') = ?", [$filterValue]);

// PostgreSQL JSONB query
$query->whereRaw("value->>'value' = ?", [$filterValue]);

// Compound filters
$query->where(function($q) use ($filters) {
    foreach ($filters as $filter) {
        $method = $filter['logic'] === 'or' ? 'orWhereRaw' : 'whereRaw';
        $q->$method($this->buildFilterCondition($filter));
    }
});
```

**Filter Operators per Type:**
| Type | Operators |
|------|-----------|
| text | equals, contains, starts_with, is_empty |
| number | equals, gt, gte, lt, lte, between |
| date | equals, before, after, between, is_empty |
| status/priority | equals, in, not_in |
| user | equals, in, is_empty |
| labels | contains_any, contains_all |
| checkbox | is_true, is_false |

**Rationale**:
- Leverages database JSON capabilities
- Avoids N+1 queries
- Supports complex filter combinations

### D5: Column Options Schema

**Decision**: Use JSON Schema for type-specific options validation.

```json
// Status column options
{
  "options": [
    {"id": "todo", "label": "To Do", "color": "#9CA3AF"},
    {"id": "in_progress", "label": "In Progress", "color": "#3B82F6"},
    {"id": "done", "label": "Done", "color": "#10B981"}
  ],
  "default_value": "todo"
}

// Number column options
{
  "format": "currency",
  "currency": "USD",
  "precision": 2,
  "min": 0,
  "max": 1000000
}

// Date column options
{
  "format": "YYYY-MM-DD",
  "include_time": false,
  "default_to_today": false
}
```

### D6: Database Schema

```
┌───────────────────┐
│   board_columns   │
├───────────────────┤
│ id (PK)           │
│ board_id (FK)     │───────────────┐
│ name              │               │
│ type              │               │
│ options (JSON)    │               │
│ position          │               │
│ width             │               │
│ is_hidden         │               │
│ is_pinned         │               │
│ is_required       │               │
│ created_at        │               │
│ updated_at        │               │
└─────────┬─────────┘               │
          │                         │
          │ 1:N                     │
          ▼                         │
┌───────────────────┐               │
│ task_field_values │               │
├───────────────────┤               │
│ id (PK)           │               │
│ task_id (FK)      │───────────────┼──► tasks
│ column_id (FK)    │───────────────┘
│ value (JSON)      │
│ created_at        │
│ updated_at        │
└───────────────────┘

┌─────────────────────────┐
│ user_board_preferences  │
├─────────────────────────┤
│ id (PK)                 │
│ user_id (FK)            │
│ board_id (FK)           │
│ column_order (JSON)     │ // Array of column IDs
│ column_widths (JSON)    │ // {column_id: width}
│ hidden_columns (JSON)   │ // Array of column IDs
│ saved_filters (JSON)    │ // Array of filter objects
│ created_at              │
│ updated_at              │
└─────────────────────────┘
```

### D7: Drag-and-Drop Strategy

**Decision**: Use Angular CDK with optimistic updates.

```typescript
// Row reorder
onRowDrop(event: CdkDragDrop<Task[]>) {
  // 1. Calculate new position
  const newPosition = this.calculatePosition(
    event.previousIndex,
    event.currentIndex
  );
  
  // 2. Optimistic update
  moveItemInArray(this.tasks, event.previousIndex, event.currentIndex);
  
  // 3. Persist to backend
  this.taskService.updatePosition(task.id, newPosition).subscribe({
    error: () => this.revertMove()
  });
}

// Column reorder
onColumnDrop(event: CdkDragDrop<BoardColumn[]>) {
  // Similar pattern for columns
}
```

**Rationale**:
- CDK provides accessible drag-and-drop
- Optimistic updates feel instant
- Rollback on failure maintains consistency

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| JSON query performance | Medium | Proper indexing, consider materialized views |
| Complex filter queries | Medium | Query builder with limits, pagination |
| Column type migration | Low | Type registry handles conversions |
| State sync issues | Low | Optimistic updates with rollback |

## Migration Plan

### Phase 1: Column Infrastructure
1. Create board_columns table
2. Create task_field_values table
3. Migrate existing fixed columns to dynamic

### Phase 2: Column Management
1. Implement column CRUD API
2. Build column management UI
3. Add default columns to new boards

### Phase 3: Cell Renderers
1. Implement each cell type component
2. Integrate with task table
3. Add inline editing

### Phase 4: Advanced Features
1. Implement filtering system
2. Implement bulk actions
3. Add user preferences

## Open Questions

1. **Default columns on new board**: Which columns should be created by default?
   - *Proposed*: Title (required), Status, Priority, Assignee, Due Date

2. **Column deletion behavior**: What happens to task data when column is deleted?
   - *Proposed*: Soft delete column, data preserved but hidden; hard delete requires confirmation

3. **Maximum columns per board**: Should there be a limit?
   - *Proposed*: Soft limit of 50 columns, subscription-tier based
