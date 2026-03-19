# Change: Add Notifications System

## Why

Users need to stay informed about important events without constantly checking the app:
- Task assignments and mentions
- Due date reminders
- Workspace invitations
- Status changes on watched tasks

## What Changes

### Notification Entity
- notifications table with type, data, read status
- user_notification_preferences for channel control

### In-App Notifications
- Bell icon with unread count
- Dropdown with recent notifications
- Full notifications page with filters

### Email Notifications
- Templates for key events
- Respect user preferences
- Tenant-level controls

### Reminders
- Scheduled job for due date reminders
- Configurable reminder timing
- In-app and email delivery

## Impact

### Affected Specs (New Capabilities)
- `notification-entity`: Data model, types, preferences
- `notification-api`: REST endpoints, mark as read
- `notification-ui`: Bell icon, dropdown, page

### Dependencies
- Requires task, user, workspace features
- Integrates with real-time for live updates

### Affected Code Areas
- **Database**: notifications, user_notification_preferences tables
- **Jobs**: DueDateReminderJob
- **Services**: NotificationService
- **Components**: NotificationBell, NotificationList
