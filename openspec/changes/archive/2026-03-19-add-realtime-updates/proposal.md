# Change: Add Real-Time Updates

## Why

A modern collaborative task manager requires real-time updates so that:
- Multiple team members can work on the same board simultaneously
- Changes are instantly visible without manual refresh
- Collaboration feels seamless and responsive
- Conflicts between users are handled gracefully

This feature enhances the user experience for teams working together in real-time.

## What Changes

### Real-Time Infrastructure
- **Laravel Broadcasting**: Event broadcasting via WebSockets
- **Channel Architecture**: Per-board private channels with tenant scoping
- **Event System**: Typed events for all task/board mutations

### Events & Payloads
- Task events: Created, Updated, Deleted, Reordered
- Comment events: Added, Updated, Deleted
- Column events: Created, Updated, Deleted, Reordered
- Presence events: UserJoined, UserLeft

### Frontend Integration
- **RealtimeService**: WebSocket connection management
- **State Synchronization**: Merge remote updates with local state
- **Conflict Resolution**: Last-write-wins with visual indicators
- **Fallback**: Polling when WebSockets unavailable

### Configuration
- System-level and tenant-level real-time toggles
- Graceful degradation to polling

## Impact

### Affected Specs (New Capabilities)
- `broadcasting-events`: Laravel events, channels, authorization
- `realtime-frontend`: Angular WebSocket integration
- `presence-indicators`: Online user display

### Dependencies
- Requires `add-task-table-crud` (Task events)
- Requires `add-dynamic-columns` (Column events)
- Requires WebSocket server (Pusher, Ably, or self-hosted)

### Affected Code Areas
- **Events**: TaskCreated, TaskUpdated, etc.
- **Channels**: BoardChannel with authorization
- **Services**: RealtimeService, PresenceService (Angular)
- **Config**: Broadcasting driver configuration
