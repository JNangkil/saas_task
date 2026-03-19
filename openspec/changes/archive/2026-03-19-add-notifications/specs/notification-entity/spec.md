## ADDED Requirements

### Requirement: Notification Entity
The system SHALL provide a Notification entity for storing user notifications.

**Attributes:**
- id: UUID primary key
- user_id: FK to recipient user (required)
- type: Notification type string (required)
- title: Notification title (required)
- body: Notification body text (nullable)
- data: JSON with context data
- is_read: Boolean (default false)
- read_at: Timestamp when read
- created_at: Timestamp

#### Scenario: Create notification
- **WHEN** an event triggers a notification
- **THEN** a notification record is created for recipient

---

### Requirement: Notification Types
The system SHALL support defined notification types.

| Type | Trigger | Description |
|------|---------|-------------|
| task.assigned | Task assigned to user | You were assigned to task |
| task.mentioned | @mention in comment | You were mentioned |
| task.status_changed | Status of watched task | Task status changed |
| task.due_reminder | Due date approaching | Task due tomorrow |
| task.overdue | Past due date | Task is overdue |
| workspace.invited | Invited to workspace | You were invited |
| system.announcement | Admin announcement | System message |

#### Scenario: Valid notification type
- **WHEN** creating a notification
- **THEN** type must be from defined list

---

### Requirement: Notification Data Payloads
The system SHALL store contextual data in JSON format.

#### Scenario: Task notification data
- **WHEN** notification is task-related
- **THEN** data includes task_id, task_title, board_id, action_url

#### Scenario: Workspace notification data
- **WHEN** notification is workspace-related
- **THEN** data includes workspace_id, workspace_name, inviter_name

---

### Requirement: User Notification Preferences
The system SHALL store user preferences for notifications.

**user_notification_preferences table:**
- user_id: FK primary key
- preferences: JSON with preference flags
- updated_at: Timestamp

#### Scenario: Default preferences
- **WHEN** user has no preferences set
- **THEN** default values are used (all enabled)

#### Scenario: Preference structure
- **WHEN** preferences are stored
- **THEN** JSON includes email toggles per type

---

### Requirement: Notification Service
The system SHALL provide a central NotificationService.

#### Scenario: Send notification
- **WHEN** NotificationService.send is called
- **THEN** notification is created in database
- **AND** email sent if preference allows

#### Scenario: Check preferences
- **WHEN** sending notification
- **THEN** user preferences are checked first

---

### Requirement: Email Notifications
The system SHALL send email notifications for key events.

#### Scenario: Email for task assignment
- **WHEN** user is assigned to task
- **AND** email_task_assigned preference is enabled
- **THEN** email is sent

#### Scenario: Email for mention
- **WHEN** user is mentioned in comment
- **AND** email_task_mentioned preference is enabled
- **THEN** email is sent

#### Scenario: Email for reminder
- **WHEN** due date reminder triggers
- **AND** email_due_reminders preference is enabled
- **THEN** email is sent

---

### Requirement: Due Date Reminder Job
The system SHALL run scheduled job for due date reminders.

#### Scenario: Daily reminder check
- **WHEN** DueDateReminderJob runs
- **THEN** tasks with upcoming due dates are identified

#### Scenario: Send reminder
- **WHEN** task due date is within reminder window
- **AND** reminder not already sent
- **THEN** notification and email are sent

#### Scenario: Configurable reminder timing
- **WHEN** user sets reminder_days_before
- **THEN** reminder is sent that many days before due
