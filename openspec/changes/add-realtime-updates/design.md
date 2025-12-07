# Design: Real-Time Updates

## Context

This design documents the architecture for real-time collaborative updates in the task manager. The system must support:
- Live updates when tasks are created, modified, or deleted
- Multiple users viewing and editing the same board
- Graceful fallback when WebSockets are unavailable
- Multi-tenant isolation of broadcast events

**Dependencies**: Extends `add-task-table-crud` and `add-dynamic-columns`.

## Goals / Non-Goals

### Goals
- Implement real-time updates for task/column changes
- Provide presence indicators for collaborative awareness
- Support multiple WebSocket providers (Pusher, Ably, Soketi)
- Graceful fallback to polling
- Tenant-scoped event isolation

### Non-Goals
- Real-time collaborative text editing (Google Docs style)
- Operational transformation / CRDTs for conflict resolution
- Offline-first with sync (future feature)
- Video/audio communication

## Decisions

### D1: Broadcasting Architecture

**Decision**: Use Laravel Echo with pluggable driver for broadcasting.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Laravel App     │     │  WebSocket       │     │  Angular App     │
│                  │     │  Server          │     │                  │
│  ┌────────────┐  │     │  (Pusher/Ably/   │     │  ┌────────────┐  │
│  │ Controller │──┼────▶│   Soketi)        │────▶│  │ Echo       │  │
│  └────────────┘  │     │                  │     │  │ Client     │  │
│        │         │     └──────────────────┘     │  └────────────┘  │
│        ▼         │                              │        │         │
│  ┌────────────┐  │                              │        ▼         │
│  │ Event      │  │                              │  ┌────────────┐  │
│  │ Broadcast  │  │                              │  │ State Mgr  │  │
│  └────────────┘  │                              │  └────────────┘  │
└──────────────────┘                              └──────────────────┘
```

**Rationale**:
- Laravel Echo abstracts WebSocket provider
- Easy to swap between Pusher, Ably, or self-hosted Soketi
- Built-in support for private channels and presence

### D2: Channel Strategy

**Decision**: Use private channels scoped by board with tenant verification.

```php
// Channel naming convention
"private-tenant.{tenant_id}.board.{board_id}"

// Example
"private-tenant.abc123.board.xyz789"
```

**Channel Types:**
| Channel | Purpose | Auth |
|---------|---------|------|
| `private-tenant.{t}.board.{b}` | Board updates | Workspace member |
| `presence-tenant.{t}.board.{b}` | User presence | Workspace member |
| `private-tenant.{t}.workspace.{w}` | Workspace-wide | Workspace member |

**Authorization Logic:**
```php
Broadcast::channel('tenant.{tenantId}.board.{boardId}', function ($user, $tenantId, $boardId) {
    // Verify user belongs to tenant
    if (!$user->belongsToTenant($tenantId)) {
        return false;
    }
    
    // Verify user can access board
    $board = Board::find($boardId);
    return $board && $user->canAccessWorkspace($board->workspace_id);
});
```

**Rationale**:
- Tenant prefix ensures multi-tenant isolation
- Board-level granularity minimizes unnecessary broadcasts
- Presence channels enable collaboration awareness

### D3: Event Payload Structure

**Decision**: Standardized event payload with metadata.

```json
{
  "event": "task.updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "actor": {
    "id": "user-uuid",
    "name": "John Doe",
    "avatar": "https://..."
  },
  "data": {
    "id": "task-uuid",
    "changes": {
      "status": { "from": "todo", "to": "in_progress" },
      "assignee_id": { "from": null, "to": "user-uuid" }
    },
    "task": { /* full task object for convenience */ }
  }
}
```

**Event Types:**
| Event | Data |
|-------|------|
| task.created | Full task object |
| task.updated | Task ID, changed fields, full task |
| task.deleted | Task ID |
| task.reordered | Array of {id, position} |
| column.created | Full column object |
| column.updated | Column ID, changed fields |
| column.deleted | Column ID |
| columns.reordered | Array of {id, position} |
| comment.added | Full comment object |

**Rationale**:
- `changes` object enables diff-based updates
- Full object included for simplicity
- `actor` enables "edited by X" indicators

### D4: Conflict Resolution Strategy

**Decision**: Last-write-wins with visual indicators for concurrent edits.

```typescript
handleRemoteUpdate(event: TaskUpdatedEvent) {
  const localTask = this.getTask(event.data.id);
  
  // Check if user is currently editing this task
  if (this.isEditing(event.data.id)) {
    // Show indicator that task was updated by another user
    this.showConflictIndicator(event.data.id, event.actor);
    return; // Don't override active edit
  }
  
  // Check timestamp to avoid applying stale updates
  if (new Date(event.timestamp) < new Date(localTask.updated_at)) {
    return; // Ignore stale event
  }
  
  // Apply remote update
  this.updateLocalTask(event.data.id, event.data.task);
}
```

**Conflict Scenarios:**
1. **No conflict**: Other user edits task user isn't editing → apply immediately
2. **Viewing conflict**: User viewing task that was updated → update with flash highlight
3. **Editing conflict**: User editing task that was updated → show banner, let user choose
4. **Optimistic conflict**: Local edit not yet synced, remote update arrives → queue remote, apply after sync

**Rationale**:
- Simple to implement and understand
- Works for 95% of real collaborative scenarios
- Full CRDT is overkill for this use case

### D5: Polling Fallback

**Decision**: Automatic fallback to polling when WebSocket fails.

```typescript
class RealtimeService {
  private connectionState: 'connected' | 'connecting' | 'polling' | 'disconnected';
  private pollingInterval = 5000; // 5 seconds
  
  connect(boardId: string) {
    try {
      this.echoClient.join(`tenant.${tenantId}.board.${boardId}`)
        .connected(() => this.connectionState = 'connected')
        .error(() => this.fallbackToPolling(boardId));
    } catch {
      this.fallbackToPolling(boardId);
    }
  }
  
  private fallbackToPolling(boardId: string) {
    this.connectionState = 'polling';
    this.pollTimer = setInterval(() => this.pollForUpdates(boardId), this.pollingInterval);
  }
}
```

**Polling Endpoint:**
```
GET /api/boards/{board}/updates?since=2024-01-15T10:00:00Z
```

**Response:**
```json
{
  "events": [
    { "event": "task.updated", "timestamp": "...", "data": {...} },
    { "event": "task.created", "timestamp": "...", "data": {...} }
  ],
  "sync_token": "2024-01-15T10:30:00Z"
}
```

**Rationale**:
- Ensures functionality even with WebSocket issues
- Polling interval configurable
- `sync_token` prevents missing events

### D6: Feature Configuration

**Decision**: Three-level configuration hierarchy.

```
System Level (env/config)
    ↓
Subscription Plan Level (plans table)
    ↓
Tenant Level (tenant_settings)
```

```php
// Check if realtime is available
public function isRealtimeEnabled(Tenant $tenant): bool
{
    // System level
    if (!config('realtime.enabled')) {
        return false;
    }
    
    // Plan level
    $plan = $tenant->subscription?->plan;
    if (!$plan?->hasFeature('realtime')) {
        return false;
    }
    
    // Tenant preference
    return $tenant->getSetting('realtime_enabled', true);
}
```

**Rationale**:
- System can disable globally for maintenance
- Premium feature behind subscription
- Tenants can opt-out if desired

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket server costs | Medium | Self-hosted Soketi option |
| Connection limit per plan | Low | Track connections, enforce limits |
| Event storms (many updates) | Medium | Debounce/batch events |
| Stale client state | Low | Periodic full refresh |

## Migration Plan

### Phase 1: Infrastructure
1. Set up WebSocket server
2. Configure Laravel broadcasting
3. Create channels and authorization

### Phase 2: Events
1. Create event classes
2. Fire events from controllers
3. Test event delivery

### Phase 3: Frontend
1. Install Echo client
2. Create RealtimeService
3. Integrate with state management

### Phase 4: Polish
1. Add presence indicators
2. Implement fallback polling
3. Add conflict indicators

## Open Questions

1. **WebSocket provider**: Which provider to use by default?
   - *Proposed*: Pusher for simplicity, with Soketi as self-hosted option

2. **Presence timeout**: How long before user is considered "away"?
   - *Proposed*: 30 seconds idle, 60 seconds for removal

3. **Event batching**: Should rapid updates be batched?
   - *Proposed*: 100ms debounce for same-task updates
