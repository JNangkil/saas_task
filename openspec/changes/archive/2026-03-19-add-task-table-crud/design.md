# Design: Task Table & Task CRUD

## Context

This design documents the core task management functionality modeled after Monday.com's table interface. The system must support:
- High-performance task lists with filtering and sorting
- Inline editing for rapid workflow updates
- Flexible custom fields for different use cases
- Optimistic UI updates for responsive feel

**Dependencies**: Requires `add-multi-tenant-workspace` for Board/Workspace entities.

## Goals / Non-Goals

### Goals
- Implement full CRUD for tasks with soft delete
- Provide Monday.com-style inline editing experience
- Support efficient filtering, sorting, and pagination
- Enable flexible custom fields per board
- Maintain responsive UI with optimistic updates

### Non-Goals
- Kanban view (separate feature)
- Calendar view (separate feature)
- Time tracking on tasks (future)
- Recurring tasks (future)
- Task dependencies/subtasks (future)

## Decisions

### D1: Task Position Management

**Decision**: Use fractional indexing for position ordering.

```php
// Position as decimal for insertions between items
// Item 1: position = 1.0
// Item 2: position = 2.0
// Insert between: position = 1.5

public function calculatePosition(Task $before, Task $after): float
{
    if (!$before) return $after->position / 2;
    if (!$after) return $before->position + 1;
    return ($before->position + $after->position) / 2;
}
```

**Rationale**:
- No need to update other items on reorder
- Simple insertion logic
- Periodic rebalancing if precision issues arise

### D2: Custom Fields Storage

**Decision**: Use a separate `task_custom_values` table with JSON value column.

```sql
CREATE TABLE task_custom_values (
    id BIGINT PRIMARY KEY,
    task_id BIGINT REFERENCES tasks(id),
    field_key VARCHAR(50),      -- 'custom_budget', 'custom_client'
    field_value JSON,           -- {"type": "number", "value": 5000}
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(task_id, field_key)
);
```

**Rationale**:
- Allows filtering on custom fields via JSON queries
- Separates custom data from core schema
- Supports typed values (number, text, date, select)

**Alternative Considered**:
- JSON column on tasks table: Simpler but harder to index/filter

### D3: Inline Editing Pattern

**Decision**: Optimistic updates with rollback on failure.

```typescript
async updateTaskField(taskId: string, field: string, value: any) {
  // 1. Save previous state
  const previous = this.getTask(taskId);
  
  // 2. Update local state immediately
  this.updateLocalTask(taskId, { [field]: value });
  
  // 3. Send API request
  try {
    await this.api.patch(`/tasks/${taskId}`, { [field]: value });
  } catch (error) {
    // 4. Rollback on failure
    this.updateLocalTask(taskId, previous);
    this.showError('Failed to update task');
  }
}
```

**Rationale**:
- Feels instant to users
- Handles race conditions gracefully
- Clear error recovery path

### D4: Pagination Strategy

**Decision**: Cursor-based pagination with offset fallback.

```
GET /api/boards/{board}/tasks?cursor=xxx&per_page=50

Response:
{
  "data": [...],
  "meta": {
    "cursor": "eyJpZCI6...}",
    "has_more": true,
    "total": 1250
  }
}
```

**Rationale**:
- Efficient for infinite scroll
- Stable when items added/removed
- Falls back to offset for "jump to page" use cases

### D5: Database Schema

```
┌──────────────────────┐
│       tasks          │
├──────────────────────┤
│ id (PK)              │
│ board_id (FK)        │───────────────┐
│ workspace_id (FK)    │               │
│ tenant_id (FK)       │               │
│ title                │               │
│ description (TEXT)   │               │
│ status               │               │
│ priority             │               │
│ due_date             │               │
│ start_date           │               │
│ assignee_id (FK)     │───────────────┼──► users
│ created_by (FK)      │───────────────┘
│ position             │ (DECIMAL)
│ archived_at          │
│ created_at           │
│ updated_at           │
│ deleted_at           │ (soft delete)
└──────────┬───────────┘
           │
           │ 1:N
           ▼
┌──────────────────────┐     ┌──────────────────┐
│ task_custom_values   │     │   task_labels    │
├──────────────────────┤     ├──────────────────┤
│ id (PK)              │     │ task_id (FK)     │──┐
│ task_id (FK)         │     │ label_id (FK)    │──┼─► labels
│ field_key            │     └──────────────────┘  │
│ field_value (JSON)   │                           │
│ created_at           │     ┌──────────────────┐  │
│ updated_at           │     │     labels       │◄─┘
└──────────────────────┘     ├──────────────────┤
                             │ id (PK)          │
                             │ workspace_id (FK)│
                             │ name             │
                             │ color            │
                             │ created_at       │
                             └──────────────────┘
```

### D6: Status and Priority Enums

**Decision**: Use string enums stored in database.

```php
// Status values
const STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'];

// Priority values
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
```

**Rationale**:
- Easily queryable
- Clear semantics
- Can be extended per-board in future

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large board performance | Medium | Pagination, virtualization, indexing |
| Concurrent edit conflicts | Low | Last-write-wins with timestamps |
| Custom field proliferation | Low | Limit custom fields per board |
| Position precision loss | Low | Periodic rebalancing job |

## Migration Plan

### Phase 1: Database & Models
1. Create migrations for tasks and related tables
2. Create models with relationships
3. Seed sample data

### Phase 2: Backend API
1. Implement TaskController
2. Add filtering/sorting
3. Add validation

### Phase 3: Frontend
1. Build task table component
2. Implement inline editing
3. Add details panel

### Rollback Strategy
- Migrations have `down()` methods
- No dependencies on other features for basic function
