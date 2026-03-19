# Change: Add Activity Logs & Audit Trails

## Why

A comprehensive audit trail is essential for:
- Accountability: Know who did what and when
- Debugging: Trace issues back to specific actions
- Compliance: Meet audit requirements
- Transparency: Show task history to team members

## What Changes

### Activity Tracking
- Record all significant actions across the system
- Store actor, action, entity, and changes
- Tenant and workspace scoping

### Activity Entity
- activity_logs table with JSON metadata
- Fast indexing for queries
- Retention policy support

### Activity UI
- Task activity feed in details panel
- Workspace/board activity pages
- Filters and search

### Backend Service
- Central ActivityService trait
- Event-driven logging
- Human-readable descriptions

## Impact

### Affected Specs (New Capabilities)
- `activity-entity`: Activity log data model
- `activity-api`: REST endpoints for activities
- `activity-ui`: Angular components for display

### Dependencies
- Requires all entity features (tasks, boards, workspaces)
- Integrates with existing CRUD operations

### Affected Code Areas
- **Database**: activity_logs table
- **Services**: ActivityService, LogsActivity trait
- **Components**: TaskActivityComponent, ActivityFeedComponent
