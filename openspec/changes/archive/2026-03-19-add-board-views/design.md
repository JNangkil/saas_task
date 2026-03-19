# Design: Board Views - Table, Kanban & Calendar

## Context

This design documents the architecture for multiple view modes in the task manager. All views share the same underlying task data but present it differently based on user workflow needs.

**Dependencies**: Built on top of `add-task-table-crud`, `add-dynamic-columns`, and `add-project-boards`.

## Goals / Non-Goals

### Goals
- Implement three view modes: Table, Kanban, Calendar
- Share task state across all views
- Persist user view preferences per board
- Support drag-and-drop in Kanban and Calendar
- Provide consistent task interaction across views

### Non-Goals
- Timeline/Gantt view (future feature)
- Custom view creation
- Saved views with different filters
- Dashboard/summary view

## Decisions

### D1: View Architecture

**Decision**: Use a container component with dynamic view rendering.

```
┌─────────────────────────────────────────────────────┐
│              BoardViewContainer                      │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │  ViewSwitcher [Table] [Kanban] [Calendar]    │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  FilterBar (shared across views)              │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │                                               │   │
│  │  [TableView] OR [KanbanView] OR [CalendarView]│   │
│  │                                               │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │  TaskDetailsPanel (slides in from right)      │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Rationale**:
- Single source of task state
- Consistent filtering across views
- Shared details panel
- Easy view switching

### D2: View State Flow

**Decision**: Use a central BoardStateService that all views subscribe to.

```typescript
@Injectable()
class BoardStateService {
  private tasks$ = new BehaviorSubject<Task[]>([]);
  private filters$ = new BehaviorSubject<IFilterState>({});
  private currentView$ = new BehaviorSubject<ViewType>('table');
  
  // All views subscribe to tasks$
  // Updates propagate to all views automatically
  
  updateTask(taskId: string, changes: Partial<Task>) {
    // Optimistic update
    // API call
    // Real-time sync
  }
}
```

**Rationale**:
- Single source of truth
- Changes in one view reflect in others
- Efficient reactivity with RxJS

### D3: Kanban Grouping Strategy

**Decision**: Group by any single-value column, default to status.

```typescript
interface KanbanConfig {
  groupBy: string;          // Column ID to group by
  columnOrder: string[];    // Order of columns
  collapsedColumns: string[]; // IDs of collapsed columns
}

// Group tasks by column value
const groups = tasks.reduce((acc, task) => {
  const value = task.fields[groupBy]?.value || 'unassigned';
  acc[value] = [...(acc[value] || []), task];
  return acc;
}, {});
```

**Supported Group-By Columns:**
| Column Type | Grouping |
|-------------|----------|
| status | By status value |
| priority | By priority value |
| user | By assignee |
| labels | Primary label only |

**Rationale**:
- Status is natural workflow grouping
- Flexibility for different workflows
- Unassigned column for empty values

### D4: Calendar Data Fetching

**Decision**: Fetch tasks for visible date range only.

```typescript
// GET /api/boards/{board}/tasks?view=calendar&start=2024-01-01&end=2024-01-31

interface CalendarQuery {
  view: 'calendar';
  start: string;  // ISO date (inclusive)
  end: string;    // ISO date (inclusive)
  date_field: 'due_date' | 'start_date';
}

// Backend filters: WHERE due_date BETWEEN start AND end
```

**Rationale**:
- Only fetch visible tasks
- Reduces payload size
- Enables efficient rendering

### D5: View Preferences Schema

**Decision**: Store per-user, per-board view preferences.

```sql
CREATE TABLE user_board_view_preferences (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    board_id UUID NOT NULL REFERENCES boards(id),
    preferred_view ENUM('table', 'kanban', 'calendar') DEFAULT 'table',
    kanban_config JSON,
    calendar_config JSON,
    filters JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(user_id, board_id)
);
```

**Config Structures:**
```json
// kanban_config
{
  "group_by": "status",
  "column_order": ["todo", "in_progress", "done"],
  "collapsed_columns": ["done"]
}

// calendar_config
{
  "mode": "month",
  "date_field": "due_date",
  "show_weekends": true
}
```

**Rationale**:
- User-specific preferences
- Preserved across sessions
- Flexible JSON for view-specific settings

### D6: Drag-and-Drop Architecture

**Decision**: Use Angular CDK with optimistic updates.

```typescript
// Kanban column drag
onCardDropped(event: CdkDragDrop<Task[]>, targetColumn: string) {
  const task = event.item.data;
  const previousColumn = task.status;
  
  // 1. Optimistic update
  this.updateTaskLocally(task.id, { status: targetColumn });
  
  // 2. API call
  await this.taskService.updateTask(task.id, { status: targetColumn });
  
  // 3. Handle failure
  if (error) {
    this.rollback(task.id, { status: previousColumn });
    this.showError('Failed to update status');
  }
}

// Calendar date drag
onTaskDropped(event: CdkDragDrop<any>, targetDate: Date) {
  const task = event.item.data;
  this.taskService.updateTask(task.id, { due_date: targetDate });
}
```

**Rationale**:
- CDK provides accessible drag-and-drop
- Optimistic updates for responsiveness
- Rollback for reliability

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Calendar performance (many tasks) | Medium | Pagination, virtualization |
| Kanban with many columns | Low | Horizontal scroll, collapse |
| State sync between views | Low | Central state service |
| Large board switching | Low | Progressive loading |

## Migration Plan

### Phase 1: Infrastructure
1. Create view preferences table
2. Add view parameter to task API
3. Create BoardStateService

### Phase 2: View Switcher
1. Build ViewSwitcher component
2. Integrate with routing
3. Persist preferences

### Phase 3: Kanban View
1. Build Kanban components
2. Implement drag-and-drop
3. Add grouping options

### Phase 4: Calendar View
1. Build Calendar components
2. Implement date range fetching
3. Add drag-and-drop for dates

## Open Questions

1. **Multi-day tasks**: Show tasks spanning start_date to due_date?
   - *Proposed*: Single-day display initially, multi-day as enhancement

2. **Kanban WIP limits**: Show warnings when column has too many cards?
   - *Proposed*: Optional WIP limit setting per column

3. **Calendar recurring tasks**: Support recurring task patterns?
   - *Proposed*: Defer to future feature
