# Design: Notifications System

## Context

This design documents the architecture for in-app and email notifications with user preference controls and scheduled reminders.

## Goals / Non-Goals

### Goals
- Deliver timely in-app and email notifications
- Support user preference controls per notification type
- Scheduled due date reminders
- Real-time notification updates

### Non-Goals
- Push notifications (mobile, future feature)
- SMS notifications
- Slack/Teams integrations (separate feature)

## Decisions

### D1: Notification Schema

**Decision**: Single notifications table with JSON data.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP,
    INDEX idx_user_unread (user_id, is_read, created_at DESC)
);
```

**Rationale**:
- user_id for recipient
- JSON data for flexible payloads
- Composite index for unread query

### D2: Notification Types

| Type | Trigger | Channels |
|------|---------|----------|
| task.assigned | Task assigned | in-app, email |
| task.mentioned | @mention in comment | in-app, email |
| task.status_changed | Watched task status | in-app |
| task.due_reminder | Due date approaching | in-app, email |
| task.overdue | Task past due | in-app, email |
| workspace.invited | Invited to workspace | in-app, email |
| system.announcement | Admin announcement | in-app |

### D3: User Preferences Schema

```sql
CREATE TABLE user_notification_preferences (
    user_id UUID PRIMARY KEY,
    preferences JSON NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP
);
```

**Preferences Structure:**
```json
{
  "email_task_assigned": true,
  "email_task_mentioned": true,
  "email_due_reminders": true,
  "email_workspace_invited": true,
  "reminder_days_before": 1,
  "quiet_hours_enabled": false,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "08:00"
}
```

### D4: Notification Data Payloads

**Task Assigned:**
```json
{
  "task_id": "uuid",
  "task_title": "Review PR",
  "board_id": "uuid",
  "board_name": "Development",
  "assigned_by": "John Doe",
  "action_url": "/boards/uuid/tasks/uuid"
}
```

**Mention in Comment:**
```json
{
  "task_id": "uuid",
  "task_title": "Review PR",
  "comment_id": "uuid",
  "mentioned_by": "Jane Smith",
  "comment_preview": "Hey @user, can you check..."
}
```

### D5: Reminder Job Architecture

```
┌─────────────────────────────────────┐
│     DueDateReminderJob              │
│     (Runs daily at 8:00 AM)         │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Query tasks where:                 │
│  - due_date = today + reminder_days │
│  - assignee has reminders enabled   │
│  - reminder not already sent        │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  For each task:                     │
│  - Create in-app notification       │
│  - Send email if enabled            │
│  - Mark reminder as sent            │
└─────────────────────────────────────┘
```

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Notification spam | Medium | Preference controls, batching |
| Email deliverability | Medium | Use reliable provider, SPF/DKIM |
| Job failures | Low | Retry logic, monitoring |

## Open Questions

1. **Notification batching**: Batch multiple notifications into digest?
   - *Proposed*: Not initially, add later

2. **Default reminder timing**: 1 day before or configurable?
   - *Proposed*: Default 1 day, user configurable
