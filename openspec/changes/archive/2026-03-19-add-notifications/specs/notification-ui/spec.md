## ADDED Requirements

### Requirement: Notification Bell Component
The Angular application SHALL provide a NotificationBellComponent in the navbar.

#### Scenario: Display bell icon
- **WHEN** user is authenticated
- **THEN** notification bell appears in navbar

#### Scenario: Show unread badge
- **WHEN** user has unread notifications
- **THEN** badge shows count on bell icon

#### Scenario: Hide badge when zero
- **WHEN** all notifications are read
- **THEN** badge is not displayed

---

### Requirement: Notification Dropdown
The Angular application SHALL provide a dropdown from the bell icon.

#### Scenario: Open dropdown
- **WHEN** user clicks bell icon
- **THEN** dropdown shows recent notifications

#### Scenario: Show notification items
- **WHEN** dropdown is open
- **THEN** each notification shows title, time, read status

#### Scenario: Navigate on click
- **WHEN** user clicks a notification
- **THEN** they are navigated to action_url
- **AND** notification is marked as read

#### Scenario: View all link
- **WHEN** dropdown is open
- **THEN** view all notifications link is available

---

### Requirement: Notifications Page
The Angular application SHALL provide a full notifications page.

#### Scenario: Display notifications list
- **WHEN** user navigates to notifications page
- **THEN** all notifications are displayed

#### Scenario: Filter by read status
- **WHEN** user selects unread filter
- **THEN** only unread notifications shown

#### Scenario: Filter by type
- **WHEN** user selects notification type
- **THEN** only that type is shown

#### Scenario: Mark all as read
- **WHEN** user clicks mark all as read
- **THEN** all notifications are marked read

---

### Requirement: Notification Item Display
The Angular application SHALL display notification items consistently.

#### Scenario: Show notification title
- **WHEN** notification is displayed
- **THEN** title is prominently shown

#### Scenario: Show relative time
- **WHEN** notification is displayed
- **THEN** relative time is shown (e.g., 2 hours ago)

#### Scenario: Visual unread indicator
- **WHEN** notification is unread
- **THEN** visual indicator distinguishes it

---

### Requirement: Notification Preferences UI
The Angular application SHALL provide preferences management.

#### Scenario: Display preferences form
- **WHEN** user opens notification settings
- **THEN** form with toggles is displayed

#### Scenario: Toggle email preferences
- **WHEN** user toggles email for task assigned
- **THEN** preference is saved

#### Scenario: Set reminder timing
- **WHEN** user sets reminder days before
- **THEN** preference is saved

---

### Requirement: Angular Notification Service
The Angular application SHALL provide a NotificationService.

#### Scenario: NotificationService methods
- **WHEN** the service is used
- **THEN** it provides getNotifications, getUnreadCount, markAsRead, markAllAsRead methods

---

### Requirement: Real-time Notification Updates
The Angular application SHALL update notifications in real-time.

#### Scenario: New notification received
- **WHEN** server broadcasts new notification
- **THEN** bell count updates immediately
- **AND** notification appears in dropdown
