# Tasks: Add Notifications System

## 1. Database Schema

- [x] 1.1 Create notifications table
- [x] 1.2 Create user_notification_preferences table
- [x] 1.3 Add indexes for user_id, is_read, created_at
- [x] 1.4 Create models with casts

## 2. Notification Types & Service

- [x] 2.1 Define notification type constants
- [x] 2.2 Create NotificationService class
- [x] 2.3 Create notification factory methods
- [x] 2.4 Integrate with Laravel notifications

## 3. In-App Notifications

- [x] 3.1 Create database notification channel
- [x] 3.2 Store notifications in database
- [x] 3.3 Generate notification title and body
- [x] 3.4 Include action URLs in data

## 4. Email Notifications

- [x] 4.1 Create TaskAssigned email template
- [x] 4.2 Create MentionInComment email template
- [x] 4.3 Create WorkspaceInvitation email template
- [x] 4.4 Create DueDateReminder email template
- [x] 4.5 Email styling and branding

## 5. Notification Preferences

- [x] 5.1 GET /api/users/me/notification-preferences
- [x] 5.2 PATCH /api/users/me/notification-preferences
- [x] 5.3 Define preference schema
- [x] 5.4 Check preferences before sending

## 6. Notifications API

- [x] 6.1 GET /api/notifications (paginated)
- [x] 6.2 GET /api/notifications/unread-count
- [x] 6.3 PATCH /api/notifications/{id}/read
- [x] 6.4 PATCH /api/notifications/read-all
- [x] 6.5 DELETE /api/notifications/{id}

## 7. Due Date Reminders

- [x] 7.1 Create DueDateReminderJob
- [x] 7.2 Query tasks with approaching due dates
- [x] 7.3 Send reminder notifications
- [x] 7.4 Schedule job to run daily
- [x] 7.5 Track sent reminders to avoid duplicates

## 8. Angular Notification Service

- [x] 8.1 Create NotificationService
- [x] 8.2 Fetch notifications with pagination
- [x] 8.3 Mark as read functionality
- [x] 8.4 Real-time notification updates

## 9. Notification Bell Component

- [x] 9.1 Create NotificationBellComponent
- [x] 9.2 Display unread count badge
- [x] 9.3 Dropdown with recent notifications
- [x] 9.4 Click to navigate to target

## 10. Notifications Page

- [x] 10.1 Create NotificationsPageComponent
- [x] 10.2 Filter by read/unread
- [x] 10.3 Filter by type
- [x] 10.4 Mark all as read button
- [x] 10.5 Infinite scroll loading

## 11. Preferences UI

- [x] 11.1 Create NotificationPreferencesComponent
- [x] 11.2 Toggle switches for each preference
- [x] 11.3 Group by notification type
- [x] 11.4 Save preferences

## 12. Testing

- [ ] 12.1 PHPUnit tests for NotificationService
- [ ] 12.2 PHPUnit tests for reminder job
- [ ] 12.3 Angular tests for components
- [ ] 12.4 E2E test: notification flow
