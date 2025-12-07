# Tasks: Add Real-Time Updates

## 1. Broadcasting Infrastructure

- [ ] 1.1 Configure Laravel broadcasting driver (Pusher/Ably/Soketi)
- [ ] 1.2 Set up WebSocket server (or cloud service)
- [ ] 1.3 Create BroadcastServiceProvider configuration
- [ ] 1.4 Add broadcasting credentials to environment config
- [ ] 1.5 Create realtime feature flag in config/settings

## 2. Channel Architecture

- [ ] 2.1 Create BoardChannel (private channel per board)
- [ ] 2.2 Create WorkspaceChannel for workspace-wide events
- [ ] 2.3 Implement channel authorization (user must be workspace member)
- [ ] 2.4 Add tenant scoping to channel authorization
- [ ] 2.5 Create PresenceChannel for user presence

## 3. Task Events

- [ ] 3.1 Create TaskCreated event (implements ShouldBroadcast)
- [ ] 3.2 Create TaskUpdated event with changed fields
- [ ] 3.3 Create TaskDeleted event
- [ ] 3.4 Create TaskReordered event (batch position changes)
- [ ] 3.5 Fire events from TaskController/TaskService
- [ ] 3.6 Exclude originating user from receiving own events

## 4. Comment Events

- [ ] 4.1 Create CommentAdded event
- [ ] 4.2 Create CommentUpdated event
- [ ] 4.3 Create CommentDeleted event
- [ ] 4.4 Fire events from comment operations

## 5. Column Events

- [ ] 5.1 Create ColumnCreated event
- [ ] 5.2 Create ColumnUpdated event (name, options, visibility)
- [ ] 5.3 Create ColumnDeleted event
- [ ] 5.4 Create ColumnsReordered event
- [ ] 5.5 Fire events from BoardColumnController

## 6. Presence System

- [ ] 6.1 Create presence channel for board viewers
- [ ] 6.2 Track user join/leave events
- [ ] 6.3 Create UserPresence model/DTO with avatar, name
- [ ] 6.4 Implement presence heartbeat mechanism

## 7. Angular Real-Time Service

- [ ] 7.1 Install Pusher/Echo client library
- [ ] 7.2 Create RealtimeService with connection management
- [ ] 7.3 Implement channel subscription/unsubscription
- [ ] 7.4 Create event handlers for each event type
- [ ] 7.5 Add reconnection logic with backoff

## 8. State Synchronization

- [ ] 8.1 Create BoardStateManager for merging remote updates
- [ ] 8.2 Implement task state merge (add, update, remove)
- [ ] 8.3 Implement optimistic update with remote confirmation
- [ ] 8.4 Handle conflict detection (concurrent edits)
- [ ] 8.5 Show conflict resolution UI when needed

## 9. Presence UI

- [ ] 9.1 Create BoardPresenceComponent (avatar row)
- [ ] 9.2 Display list of users currently viewing board
- [ ] 9.3 Show user name on hover
- [ ] 9.4 Animate user join/leave transitions
- [ ] 9.5 Limit display to N users + "+X more"

## 10. Configuration & Feature Flags

- [ ] 10.1 Add system-level realtime enabled flag
- [ ] 10.2 Add tenant-level realtime enabled flag
- [ ] 10.3 Add subscription plan check for realtime feature
- [ ] 10.4 Create API endpoint to check realtime availability

## 11. Polling Fallback

- [ ] 11.1 Detect WebSocket connection failure
- [ ] 11.2 Implement polling service with configurable interval
- [ ] 11.3 GET /api/boards/{board}/updates?since={timestamp}
- [ ] 11.4 Merge polled updates with local state
- [ ] 11.5 Disable polling when WebSocket reconnects

## 12. Testing & Validation

- [ ] 12.1 PHPUnit tests for event broadcasting
- [ ] 12.2 PHPUnit tests for channel authorization
- [ ] 12.3 Angular unit tests for RealtimeService
- [ ] 12.4 E2E test: two users, one edits, other sees update
- [ ] 12.5 Test WebSocket to polling fallback
