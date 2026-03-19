## ADDED Requirements

### Requirement: Real-Time Service
The Angular application SHALL provide a RealtimeService for WebSocket connection management.

```typescript
interface IRealtimeService {
  connect(): void;
  disconnect(): void;
  subscribeToBoard(boardId: string): Observable<BoardEvent>;
  unsubscribeFromBoard(boardId: string): void;
  getConnectionState(): Observable<ConnectionState>;
}

type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'polling' | 'disconnected';

interface BoardEvent {
  event: string;
  timestamp: string;
  actor: IUserSummary;
  data: any;
}
```

#### Scenario: Initialize realtime connection
- **WHEN** the application starts and user is authenticated
- **THEN** RealtimeService establishes WebSocket connection
- **AND** stores authentication token for channel subscriptions

#### Scenario: Subscribe to board channel
- **WHEN** user navigates to a board
- **THEN** RealtimeService subscribes to the board channel
- **AND** begins receiving events for that board

#### Scenario: Unsubscribe on navigation
- **WHEN** user leaves a board
- **THEN** RealtimeService unsubscribes from that board channel
- **AND** stops receiving events

---

### Requirement: Connection State Management
The Angular application SHALL manage WebSocket connection state with automatic reconnection.

#### Scenario: Automatic reconnection
- **WHEN** WebSocket connection drops
- **THEN** RealtimeService attempts to reconnect
- **AND** uses exponential backoff (1s, 2s, 4s, 8s, max 30s)

#### Scenario: Connection state indicator
- **WHEN** connection state changes
- **THEN** UI can display connection status
- **AND** shows appropriate icon (connected, reconnecting, offline)

#### Scenario: Max retries fallback
- **WHEN** reconnection fails after 5 attempts
- **THEN** service falls back to polling mode
- **AND** continues attempting WebSocket in background

---

### Requirement: Event Handling and State Updates
The Angular application SHALL handle incoming events and update local state accordingly.

#### Scenario: Handle task.created event
- **WHEN** a task.created event is received
- **THEN** the new task is added to the local task list
- **AND** task appears at correct position
- **AND** UI animates the addition (subtle highlight)

#### Scenario: Handle task.updated event
- **WHEN** a task.updated event is received
- **THEN** the local task is updated with new values
- **AND** only changed fields are merged
- **AND** UI highlights the updated row briefly

#### Scenario: Handle task.deleted event
- **WHEN** a task.deleted event is received
- **THEN** the task is removed from local state
- **AND** UI animates the removal

#### Scenario: Handle task.reordered event
- **WHEN** a task.reordered event is received
- **THEN** local task positions are updated
- **AND** task list re-renders with new order

---

### Requirement: Conflict Detection and Resolution
The Angular application SHALL detect and handle conflicts between local and remote edits.

#### Scenario: Remote update while not editing
- **WHEN** a remote update arrives for a task user is NOT editing
- **THEN** the update is applied immediately
- **AND** a brief highlight indicates the change

#### Scenario: Remote update while editing same field
- **WHEN** a remote update arrives for a field user IS editing
- **THEN** the local edit state is preserved
- **AND** a banner shows "Updated by [User Name]"
- **AND** user can choose to keep their changes or accept remote

#### Scenario: Remote update for different field
- **WHEN** a remote update arrives for different field than user is editing
- **THEN** the non-conflicting field is updated
- **AND** user's active edit is not affected

#### Scenario: Optimistic update confirmation
- **WHEN** local edit is saved and remote confirmation arrives
- **THEN** local optimistic state is verified
- **AND** any discrepancies are resolved (server wins for conflicts)

---

### Requirement: Polling Fallback
The Angular application SHALL fall back to polling when WebSocket is unavailable.

```typescript
interface IPollingService {
  startPolling(boardId: string, interval?: number): void;
  stopPolling(boardId: string): void;
  setInterval(ms: number): void;
}
```

#### Scenario: Detect WebSocket failure
- **WHEN** WebSocket connection cannot be established
- **THEN** RealtimeService switches to polling mode
- **AND** starts polling at 5-second intervals

#### Scenario: Resume WebSocket when available
- **WHEN** polling is active and WebSocket becomes available
- **THEN** service switches back to WebSocket
- **AND** stops polling

#### Scenario: Merge polled updates
- **WHEN** polling returns new events
- **THEN** events are processed in order
- **AND** local state is updated accordingly

---

### Requirement: Event Deduplication
The Angular application SHALL prevent duplicate event processing.

#### Scenario: Deduplicate by event ID
- **WHEN** the same event is received twice (e.g., reconnection overlap)
- **THEN** the event is processed only once
- **AND** duplicates are silently ignored

#### Scenario: Ignore stale events
- **WHEN** an event timestamp is older than local state
- **THEN** the event is ignored
- **AND** local state remains unchanged

---

### Requirement: Real-Time Feature Flag Check
The Angular application SHALL check if real-time features are available.

#### Scenario: Check realtime availability
- **WHEN** application initializes
- **THEN** it checks if realtime is enabled for current tenant
- **AND** configures connection mode accordingly

#### Scenario: Realtime disabled
- **WHEN** realtime is disabled (system or plan level)
- **THEN** RealtimeService uses polling only
- **AND** no WebSocket connection is attempted

**API Endpoint:**
```
GET /api/settings/realtime
```

**Response:**
```json
{
  "enabled": true,
  "mode": "websocket",
  "provider": "pusher",
  "config": {
    "key": "app-key",
    "cluster": "us2"
  }
}
```

---

### Requirement: Update Animation
The Angular application SHALL provide visual feedback for remote updates.

#### Scenario: Highlight updated row
- **WHEN** a task is updated remotely
- **THEN** the row briefly highlights (e.g., yellow flash)
- **AND** highlight fades after 1 second

#### Scenario: Animate new task
- **WHEN** a new task appears via real-time
- **THEN** it slides into position with animation
- **AND** highlights briefly to draw attention

#### Scenario: Animate deletion
- **WHEN** a task is deleted remotely
- **THEN** the row fades out or slides away
- **AND** list reflows smoothly

---

### Requirement: Remote Edit Indicators
The Angular application SHALL show when another user is editing a task.

#### Scenario: Show editing indicator
- **WHEN** another user starts editing a task
- **THEN** a subtle indicator appears on that row
- **AND** shows the user's avatar/name

#### Scenario: Clear editing indicator
- **WHEN** the other user finishes editing
- **THEN** the indicator is removed
- **AND** the update is applied
