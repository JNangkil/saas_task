# Tasks: Add Notifications System

## 1. Database Schema

- [ ] 1.1 Create notifications table
- [ ] 1.2 Create user_notification_preferences table
- [ ] 1.3 Add indexes for user_id, is_read, created_at
- [ ] 1.4 Create models with casts

## 2. Notification Types & Service

- [ ] 2.1 Define notification type constants
- [ ] 2.2 Create NotificationService class
- [ ] 2.3 Create notification factory methods
- [ ] 2.4 Integrate with Laravel notifications

## 3. In-App Notifications

- [ ] 3.1 Create database notification channel
- [ ] 3.2 Store notifications in database
- [ ] 3.3 Generate notification title and body
- [ ] 3.4 Include action URLs in data

## 4. Email Notifications

- [ ] 4.1 Create TaskAssigned email template
- [ ] 4.2 Create MentionInComment email template
- [ ] 4.3 Create WorkspaceInvitation email template
- [ ] 4.4 Create DueDateReminder email template
- [ ] 4.5 Email styling and branding

## 5. Notification Preferences

- [ ] 5.1 GET /api/users/me/notification-preferences
- [ ] 5.2 PATCH /api/users/me/notification-preferences
- [ ] 5.3 Define preference schema
- [ ] 5.4 Check preferences before sending

## 6. Notifications API

- [ ] 6.1 GET /api/notifications (paginated)
- [ ] 6.2 GET /api/notifications/unread-count
- [ ] 6.3 PATCH /api/notifications/{id}/read
- [ ] 6.4 PATCH /api/notifications/read-all
- [ ] 6.5 DELETE /api/notifications/{id}

## 7. Due Date Reminders

- [ ] 7.1 Create DueDateReminderJob
- [ ] 7.2 Query tasks with approaching due dates
- [ ] 7.3 Send reminder notifications
- [ ] 7.4 Schedule job to run daily
- [ ] 7.5 Track sent reminders to avoid duplicates

## 8. Angular Notification Service

- [ ] 8.1 Create NotificationService
- [ ] 8.2 Fetch notifications with pagination
- [ ] 8.3 Mark as read functionality
- [ ] 8.4 Real-time notification updates

## 9. Notification Bell Component

- [ ] 9.1 Create NotificationBellComponent
- [ ] 9.2 Display unread count badge
- [ ] 9.3 Dropdown with recent notifications
- [ ] 9.4 Click to navigate to target

## 10. Notifications Page

- [ ] 10.1 Create NotificationsPageComponent
- [ ] 10.2 Filter by read/unread
- [ ] 10.3 Filter by type
- [ ] 10.4 Mark all as read button
- [ ] 10.5 Infinite scroll loading

## 11. Preferences UI

- [ ] 11.1 Create NotificationPreferencesComponent
- [ ] 11.2 Toggle switches for each preference
- [ ] 11.3 Group by notification type
- [ ] 11.4 Save preferences

## 12. Testing

- [ ] 12.1 PHPUnit tests for NotificationService
- [ ] 12.2 PHPUnit tests for reminder job
- [ ] 12.3 Angular tests for components
- [ ] 12.4 E2E test: notification flow
