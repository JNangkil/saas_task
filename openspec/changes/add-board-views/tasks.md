# Tasks: Add Board Views - Table, Kanban & Calendar

## 1. Database Schema & Preferences

- [ ] 1.1 Create `user_board_view_preferences` table (user_id, board_id, preferred_view, kanban_group_by, calendar_mode, filters JSON, created_at, updated_at)
- [ ] 1.2 Add unique constraint on (user_id, board_id)
- [ ] 1.3 Create UserBoardViewPreference model

## 2. View Preferences API

- [ ] 2.1 GET /api/boards/{board}/view-preferences (get user's preferences)
- [ ] 2.2 PATCH /api/boards/{board}/view-preferences (update preferences)
- [ ] 2.3 Create ViewPreferenceResource

## 3. Task API Enhancements

- [ ] 3.1 Add view parameter to GET /api/boards/{board}/tasks
- [ ] 3.2 Support date range filters (start, end) for calendar
- [ ] 3.3 Add grouping option for Kanban (group_by=status)
- [ ] 3.4 Optimize queries for each view type

## 4. Angular View Switcher

- [ ] 4.1 Create ViewSwitcherComponent (Table | Kanban | Calendar)
- [ ] 4.2 Persist selected view in preferences
- [ ] 4.3 Integrate with route parameters (?view=kanban)
- [ ] 4.4 Create view icons and toggle UI

## 5. View Preference Service

- [ ] 5.1 Create ViewPreferenceService
- [ ] 5.2 Implement preference loading on board open
- [ ] 5.3 Implement preference saving on change
- [ ] 5.4 Cache preferences locally

## 6. Kanban View Component

- [ ] 6.1 Create KanbanViewComponent container
- [ ] 6.2 Create KanbanColumnComponent
- [ ] 6.3 Create KanbanCardComponent
- [ ] 6.4 Implement column grouping by status field
- [ ] 6.5 Style columns with status colors

## 7. Kanban Drag-and-Drop

- [ ] 7.1 Integrate Angular CDK DragDropModule
- [ ] 7.2 Implement card drag within column (reorder)
- [ ] 7.3 Implement card drag between columns (status change)
- [ ] 7.4 Add visual feedback during drag
- [ ] 7.5 Sync status change to backend
- [ ] 7.6 Optimistic update with rollback

## 8. Kanban Card Design

- [ ] 8.1 Display task title
- [ ] 8.2 Show assignee avatar
- [ ] 8.3 Show priority indicator
- [ ] 8.4 Show due date (highlight overdue)
- [ ] 8.5 Show label chips
- [ ] 8.6 Add quick actions (edit, archive)
- [ ] 8.7 Click to open details panel

## 9. Kanban Configuration

- [ ] 9.1 Allow selecting group-by column (status default)
- [ ] 9.2 Support grouping by other columns (priority, assignee)
- [ ] 9.3 Persist group-by preference
- [ ] 9.4 Add column collapse/expand

## 10. Calendar View Component

- [ ] 10.1 Create CalendarViewComponent container
- [ ] 10.2 Create CalendarMonthComponent
- [ ] 10.3 Create CalendarWeekComponent
- [ ] 10.4 Create CalendarDayComponent
- [ ] 10.5 Create CalendarEventChip for tasks

## 11. Calendar Navigation

- [ ] 11.1 Implement month/week/day toggle
- [ ] 11.2 Add prev/next navigation
- [ ] 11.3 Add "Today" button
- [ ] 11.4 Display current date range in header
- [ ] 11.5 Fetch tasks for visible date range

## 12. Calendar Task Display

- [ ] 12.1 Position tasks on due_date
- [ ] 12.2 Option to use start_date instead
- [ ] 12.3 Show task title on calendar cell
- [ ] 12.4 Color-code by status or priority
- [ ] 12.5 Handle multiple tasks per day (stacking)
- [ ] 12.6 Click task to open details panel

## 13. Calendar Drag-and-Drop

- [ ] 13.1 Enable task dragging to different dates
- [ ] 13.2 Update due_date on drop
- [ ] 13.3 Visual feedback during drag
- [ ] 13.4 Support multi-day task display (start to due)

## 14. Calendar Filtering

- [ ] 14.1 Add filter bar for calendar
- [ ] 14.2 Filter by assignee
- [ ] 14.3 Filter by status
- [ ] 14.4 Filter by labels
- [ ] 14.5 Persist calendar filters

## 15. Shared Task Details Panel

- [ ] 15.1 Reuse TaskDetailsPanelComponent across views
- [ ] 15.2 Open panel on task click in any view
- [ ] 15.3 Update all views when task is edited in panel

## 16. Testing & Validation

- [ ] 16.1 PHPUnit tests for view preferences
- [ ] 16.2 Angular unit tests for ViewSwitcher
- [ ] 16.3 Angular unit tests for KanbanView
- [ ] 16.4 Angular unit tests for CalendarView
- [ ] 16.5 E2E test: switch views, drag in Kanban, drag in Calendar
