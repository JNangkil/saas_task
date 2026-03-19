# Design: Activity Logs & Audit Trails

## Context

This design documents the architecture for comprehensive activity tracking. The system needs to record all significant actions with minimal performance impact while providing fast querying.

## Goals / Non-Goals

### Goals
- Record all significant user and system actions
- Store changes with before/after values
- Provide fast queries by entity, workspace, tenant
- Support configurable retention policies
- Generate human-readable descriptions

### Non-Goals
- Real-time activity streaming (use existing real-time feature)
- Activity analytics/reporting (separate feature)
- Cross-tenant activity aggregation

## Decisions

### D1: Activity Log Schema

**Decision**: Single table with JSON metadata for flexibility.

```sql
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    workspace_id UUID,
    user_id UUID,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    entity_name VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_workspace (workspace_id, created_at DESC),
    INDEX idx_tenant (tenant_id, created_at DESC),
    INDEX idx_user (user_id, created_at DESC)
);
```

**Rationale**:
- Single table simplifies queries
- JSON metadata handles varied change types
- Denormalized entity_name for display without joins
- Multiple indexes for common query patterns

### D2: Action Types

**Decision**: Standardized action type enumeration.

| Action Type | Description |
|-------------|-------------|
| task.created | Task created |
| task.updated | Task fields changed |
| task.deleted | Task deleted |
| task.moved | Task moved to different board |
| task.assigned | Assignee changed |
| task.status_changed | Status changed |
| board.created | Board created |
| board.updated | Board updated |
| board.archived | Board archived |
| board.restored | Board restored |
| comment.added | Comment added |
| comment.deleted | Comment deleted |
| file.attached | File attached |
| file.removed | File removed |
| member.added | User added to workspace |
| member.removed | User removed from workspace |
| member.role_changed | User role changed |

### D3: Metadata Structure

**Decision**: Structured JSON with old/new values.

```json
{
  "changes": {
    "status": {
      "old": "todo",
      "new": "in_progress",
      "old_label": "To Do",
      "new_label": "In Progress"
    },
    "assignee_id": {
      "old": null,
      "new": "user-uuid",
      "new_name": "John Doe"
    }
  },
  "context": {
    "board_id": "board-uuid",
    "board_name": "Q1 Marketing"
  }
}
```

**Rationale**:
- Captures before/after for auditing
- Labels for human-readable display
- Context for additional information

### D4: Activity Service Architecture

**Decision**: Trait-based integration with service backing.

```php
trait LogsActivity
{
    protected static function bootLogsActivity()
    {
        static::created(fn($model) => 
            ActivityService::log('created', $model));
        
        static::updated(fn($model) => 
            ActivityService::logChanges($model));
        
        static::deleted(fn($model) => 
            ActivityService::log('deleted', $model));
    }
}

class ActivityService
{
    public static function log(
        string $action,
        Model $entity,
        ?array $metadata = null,
        ?User $actor = null
    ): ActivityLog { ... }
    
    public static function logChanges(Model $model): ?ActivityLog
    {
        $changes = $model->getChanges();
        if (empty($changes)) return null;
        // Format changes and log
    }
}
```

**Rationale**:
- Trait provides automatic model integration
- Service handles logging logic centrally
- Easy to add to existing models

### D5: Human-Readable Descriptions

**Decision**: Template-based description generation.

```php
$templates = [
    'task.created' => ':actor created task ":entity_name"',
    'task.status_changed' => ':actor changed status from ":old" to ":new"',
    'task.assigned' => ':actor assigned task to :new_name',
    'member.added' => ':actor added :target_name to workspace',
];
```

**Rationale**:
- Consistent formatting across actions
- Easy localization
- Dynamic value insertion

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| High write volume | Medium | Async queue for logging |
| Table growth | Medium | Retention policy + partitioning |
| Query performance | Low | Strategic indexes |

## Migration Plan

### Phase 1: Schema & Service
1. Create activity_logs table
2. Implement ActivityService
3. Add LogsActivity trait

### Phase 2: Integration
1. Add trait to Task model
2. Add trait to Board model
3. Manual logging for member changes

### Phase 3: API & UI
1. Implement activity endpoints
2. Build task activity component
3. Build activity feed page

## Open Questions

1. **Retention period**: Default 90 days or configurable per tenant?
   - *Proposed*: Default 90 days, premium plans get longer

2. **Activity aggregation**: Group rapid edits?
   - *Proposed*: No aggregation initially, consider later

3. **System actions**: Log automated actions (scheduled tasks)?
   - *Proposed*: Yes, with user_id = null
