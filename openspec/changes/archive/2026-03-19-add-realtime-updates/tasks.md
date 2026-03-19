# Tasks: Add Real-Time Updates

## 1. Broadcasting Infrastructure

- [x] 1.1 Configure Laravel broadcasting driver (Pusher/Ably/Soketi)
- [x] 1.2 Set up WebSocket server (or cloud service)
- [x] 1.3 Create BroadcastServiceProvider configuration
- [x] 1.4 Add broadcasting credentials to environment config
- [x] 1.5 Create realtime feature flag in config/settings

## 2. Channel Architecture

- [x] 2.1 Create BoardChannel (private channel per board)
- [x] 2.2 Create WorkspaceChannel for workspace-wide events
- [x] 2.3 Implement channel authorization (user must be workspace member)
- [x] 2.4 Add tenant scoping to channel authorization
- [x] 2.5 Create PresenceChannel for user presence

## 3. Task Events

- [x] 3.1 Create TaskCreated event (implements ShouldBroadcast)
- [x] 3.2 Create TaskUpdated event with changed fields
- [x] 3.3 Create TaskDeleted event
- [x] 3.4 Create TaskReordered event (batch position changes)
- [x] 3.5 Fire events from TaskController/TaskService
- [x] 3.6 Exclude originating user from receiving own events

## 4. Comment Events

- [x] 4.1 Create CommentAdded event
- [x] 4.2 Create CommentUpdated event
- [x] 4.3 Create CommentDeleted event
- [x] 4.4 Fire events from comment operations

## 5. Column Events

- [x] 5.1 Create ColumnCreated event
- [x] 5.2 Create ColumnUpdated event (name, options, visibility)
- [x] 5.3 Create ColumnDeleted event
- [x] 5.4 Create ColumnsReordered event
- [x] 5.5 Fire events from BoardColumnController

## 6. Presence System

- [x] 6.1 Create presence channel for board viewers
- [x] 6.2 Track user join/leave events
- [x] 6.3 Create UserPresence model/DTO with avatar, name
- [x] 6.4 Implement presence heartbeat mechanism

## 7. Angular Real-Time Service

- [x] 7.1 Install Pusher/Echo client library
- [x] 7.2 Create RealtimeService with connection management
- [x] 7.3 Implement channel subscription/unsubscription
- [x] 7.4 Create event handlers for each event type
- [x] 7.5 Add reconnection logic with backoff

## 8. State Synchronization

- [x] 8.1 Create BoardStateManager for merging remote updates
- [x] 8.2 Implement task state merge (add, update, remove)
- [ ] 8.3 Implement optimistic update with remote confirmation
- [ ] 8.4 Handle conflict detection (concurrent edits)
- [ ] 8.5 Show conflict resolution UI when needed

## 9. Presence UI

- [x] 9.1 Create BoardPresenceComponent (avatar row)
- [x] 9.2 Display list of users currently viewing board
- [x] 9.3 Show user name on hover
- [ ] 9.4 Animate user join/leave transitions
- [x] 9.5 Limit display to N users + "+X more"

## 10. Configuration & Feature Flags

- [x] 10.1 Add system-level realtime enabled flag
- [x] 10.2 Add tenant-level realtime enabled flag
- [x] 10.3 Add subscription plan check for realtime feature
- [x] 10.4 Create API endpoint to check realtime availability

## 11. Polling Fallback

- [x] 11.1 Detect WebSocket connection failure
- [x] 11.2 Implement polling service with configurable interval
- [x] 11.3 GET /api/boards/{board}/updates?since={timestamp}
- [x] 11.4 Merge polled updates with local state
- [x] 11.5 Disable polling when WebSocket reconnects

## 12. Testing & Validation

- [ ] 12.1 PHPUnit tests for event broadcasting
- [ ] 12.2 PHPUnit tests for channel authorization
- [ ] 12.3 Angular unit tests for RealtimeService
- [ ] 12.4 E2E test: two users, one edits, other sees update
- [ ] 12.5 Test WebSocket to polling fallback
