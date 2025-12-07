## ADDED Requirements

### Requirement: List Notifications Endpoint
The system SHALL provide an endpoint for listing user notifications.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | List user notifications |

**Query Parameters:**
- is_read: Filter by read status
- type: Filter by notification type
- page, per_page: Pagination

#### Scenario: Get notifications
- **WHEN** user requests notifications
- **THEN** their notifications are returned paginated

#### Scenario: Filter by unread
- **WHEN** is_read=false filter applied
- **THEN** only unread notifications returned

---

### Requirement: Unread Count Endpoint
The system SHALL provide an endpoint for unread count.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications/unread-count | Get unread count |

#### Scenario: Get unread count
- **WHEN** user requests unread count
- **THEN** integer count is returned

---

### Requirement: Mark as Read Endpoints
The system SHALL provide endpoints to mark notifications as read.

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | /api/notifications/{id}/read | Mark single as read |
| PATCH | /api/notifications/read-all | Mark all as read |

#### Scenario: Mark single as read
- **WHEN** PATCH to notification read
- **THEN** is_read is set to true and read_at is set

#### Scenario: Mark all as read
- **WHEN** PATCH to read-all
- **THEN** all user notifications marked as read

---

### Requirement: Delete Notification Endpoint
The system SHALL provide an endpoint to delete notifications.

| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | /api/notifications/{id} | Delete notification |

#### Scenario: Delete notification
- **WHEN** user deletes notification
- **THEN** notification is removed

---

### Requirement: Notification Preferences Endpoints
The system SHALL provide endpoints for managing preferences.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/me/notification-preferences | Get preferences |
| PATCH | /api/users/me/notification-preferences | Update preferences |

#### Scenario: Get preferences
- **WHEN** user requests preferences
- **THEN** current preferences are returned

#### Scenario: Update preferences
- **WHEN** user updates preferences
- **THEN** preferences are saved

---

### Requirement: Notification Authorization
The system SHALL ensure users can only access their own notifications.

#### Scenario: Access own notification
- **WHEN** user requests their notification
- **THEN** access is granted

#### Scenario: Access other notification
- **WHEN** user requests another user notification
- **THEN** HTTP 403 is returned
