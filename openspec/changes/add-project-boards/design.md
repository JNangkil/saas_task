# Design: Project Boards & Board Templates

## Context

This design documents the architecture for boards and templates in the task manager. Boards are the primary organizational unit containing tasks and columns. Templates allow quick setup of common workflows.

**Dependencies**: Requires `add-multi-tenant-workspace`. Required by `add-task-table-crud` and `add-dynamic-columns`.

## Goals / Non-Goals

### Goals
- Implement board CRUD with workspace scoping
- Support multiple board types (standard, personal)
- Provide system-level and tenant-level templates
- Enable favorites and quick access
- Support board archiving with data preservation

### Non-Goals
- Board-level permissions (use workspace roles)
- Board sharing across workspaces
- Public/shared boards (future)
- Board duplication across tenants

## Decisions

### D1: Board Database Schema

**Decision**: Store boards with denormalized tenant_id for scoping.

```sql
CREATE TABLE boards (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366F1',
    icon VARCHAR(50) DEFAULT 'clipboard',
    type ENUM('standard', 'personal') DEFAULT 'standard',
    is_archived BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id),
    position INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);
```

**Rationale**:
- `tenant_id` denormalized for efficient queries
- `type` distinguishes personal vs shared boards
- `position` enables custom ordering in sidebar
- Soft delete with `deleted_at`

### D2: Template Configuration Schema

**Decision**: Store template configuration as structured JSON.

```json
{
  "columns": [
    {
      "name": "Status",
      "type": "status",
      "position": 1,
      "options": {
        "statuses": [
          {"id": "todo", "label": "To Do", "color": "#9CA3AF"},
          {"id": "in_progress", "label": "In Progress", "color": "#3B82F6"},
          {"id": "done", "label": "Done", "color": "#10B981"}
        ]
      }
    },
    {
      "name": "Priority",
      "type": "priority",
      "position": 2
    },
    {
      "name": "Assignee",
      "type": "user",
      "position": 3
    }
  ],
  "sample_tasks": [
    {
      "title": "Example task 1",
      "status": "todo",
      "position": 1
    }
  ],
  "include_sample_tasks": false
}
```

**Rationale**:
- Complete column configuration preserved
- Optional sample tasks for demos
- Flag to control sample task creation
- Extensible for future template features

### D3: Template Hierarchy

**Decision**: Two-tier template system with visibility rules.

```
┌────────────────────────────────────┐
│         Global Templates           │
│   (tenant_id = NULL, is_global)    │
│   - System-provided                │
│   - Available to all tenants       │
└────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│         Tenant Templates           │
│   (tenant_id = X, !is_global)      │
│   - Created by tenant admins       │
│   - Available within tenant only   │
└────────────────────────────────────┘
```

**Template Visibility:**
| Template Type | Created By | Visible To |
|---------------|------------|------------|
| Global | System seed | All tenants |
| Tenant | Admin/Owner | Tenant members |

**Rationale**:
- System templates provide immediate value
- Tenant templates enable customization
- Clear ownership and visibility

### D4: Board Colors and Icons

**Decision**: Predefined palette with custom option.

**Color Presets:**
```typescript
const BOARD_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6B7280', // Gray
];
```

**Icon Set:**
- Use a subset of Lucide/Heroicons
- ~20 relevant icons (clipboard, folder, rocket, calendar, etc.)

**Rationale**:
- Curated palette ensures consistency
- Limited icons keep UI clean
- Easy to render in grid view

### D5: Database Schema Overview

```
┌────────────────────┐
│      boards        │
├────────────────────┤
│ id (PK)            │
│ workspace_id (FK)  │──────────────┐
│ tenant_id (FK)     │              │
│ name               │              │
│ description        │              │
│ color              │              │
│ icon               │              │
│ type               │              │
│ is_archived        │              │
│ created_by (FK)    │──────────────┼──► users
│ position           │              │
│ created_at         │              │
│ updated_at         │              │
│ deleted_at         │              │
└────────┬───────────┘              │
         │                          │
         │ 1:N                      ▼
         ▼                    ┌───────────────┐
    ┌─────────┐               │  workspaces   │
    │  tasks  │               └───────────────┘
    └─────────┘

┌──────────────────────┐
│   board_templates    │
├──────────────────────┤
│ id (PK)              │
│ tenant_id (FK null)  │
│ name                 │
│ description          │
│ icon                 │
│ config (JSON)        │
│ is_global            │
│ is_published         │
│ created_by (FK)      │
│ created_at           │
│ updated_at           │
└──────────────────────┘

┌──────────────────────┐
│ user_board_favorites │
├──────────────────────┤
│ user_id (FK)         │──► users
│ board_id (FK)        │──► boards
│ created_at           │
└──────────────────────┘
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Template drift | Low | Templates are snapshots, not live |
| Large template configs | Low | Validate config size limits |
| Orphaned favorites | Low | Cascade delete on board delete |

## Migration Plan

### Phase 1: Database & Models
1. Create boards table
2. Create board_templates table
3. Seed default templates

### Phase 2: Board CRUD
1. Implement BoardController
2. Add workspace scope
3. Implement favorites

### Phase 3: Templates
1. Implement template CRUD
2. Create "board from template" logic
3. Seed system templates

### Phase 4: Frontend
1. Build board list UI
2. Create board modal
3. Board settings page

## Open Questions

1. **Personal boards visibility**: Should personal boards be visible only to creator?
   - *Proposed*: Personal boards are private to creator within workspace

2. **Template previews**: Show sample board preview before creating?
   - *Proposed*: Show column list and description, no full preview

3. **Board limits**: Maximum boards per workspace?
   - *Proposed*: Subscription-based limit (Free: 3, Starter: 10, Pro: unlimited)
