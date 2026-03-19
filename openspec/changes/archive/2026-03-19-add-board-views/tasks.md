# Tasks: Add Board Views - Table, Kanban & Calendar

## 1. Database Schema & Preferences

- [x] 1.1 Create `user_board_view_preferences` table (user_id, board_id, preferred_view, kanban_group_by, calendar_mode, filters JSON, created_at, updated_at)
- [x] 1.2 Add unique constraint on (user_id, board_id)
- [x] 1.3 Create UserBoardViewPreference model

## 2. View Preferences API

- [x] 2.1 GET /api/boards/{board}/view-preferences (get user's preferences)
- [x] 2.2 PATCH /api/boards/{board}/view-preferences (update preferences)
- [x] 2.3 Create ViewPreferenceResource

## 3. Task API Enhancements

- [x] 3.1 Add view parameter to GET /api/boards/{board}/tasks
- [x] 3.2 Support date range filters (start, end) for calendar
- [ ] 3.3 Add grouping option for Kanban (group_by=status)
- [ ] 3.4 Optimize queries for each view type

## 4. Angular View Switcher

- [x] 4.1 Create ViewSwitcherComponent (Table | Kanban | Calendar)
- [x] 4.2 Persist selected view in preferences
- [x] 4.3 Integrate with route parameters (?view=kanban)
- [x] 4.4 Create view icons and toggle UI

## 5. View Preference Service

- [x] 5.1 Create ViewPreferenceService
- [x] 5.2 Implement preference loading on board open
- [x] 5.3 Implement preference saving on change
- [x] 5.4 Cache preferences locally

## 6. Kanban View Component

- [x] 6.1 Create KanbanViewComponent container
- [x] 6.2 Create KanbanColumnComponent
- [x] 6.3 Create KanbanCardComponent
- [x] 6.4 Implement column grouping by status field
- [x] 6.5 Style columns with status colors

## 7. Kanban Drag-and-Drop

- [x] 7.1 Integrate Angular CDK DragDropModule
- [x] 7.2 Implement card drag within column (reorder)
- [x] 7.3 Implement card drag between columns (status change)
- [x] 7.4 Add visual feedback during drag
- [x] 7.5 Sync status change to backend
- [x] 7.6 Optimistic update with rollback

## 8. Kanban Card Design

- [x] 8.1 Display task title
- [x] 8.2 Show assignee avatar
- [x] 8.3 Show priority indicator
- [x] 8.4 Show due date (highlight overdue)
- [x] 8.5 Show label chips
- [x] 8.6 Add quick actions (edit, archive)
- [x] 8.7 Click to open details panel

## 9. Kanban Configuration

- [x] 9.1 Allow selecting group-by column (status default)
- [x] 9.2 Support grouping by other columns (priority, assignee)
- [x] 9.3 Persist group-by preference
- [x] 9.4 Add column collapse/expand

## 10. Calendar View Component

- [x] 10.1 Create CalendarViewComponent container
- [x] 10.2 Create CalendarMonthComponent
- [x] 10.3 Create CalendarWeekComponent
- [x] 10.4 Create CalendarDayComponent
- [x] 10.5 Create CalendarEventChip for tasks

## 11. Calendar Navigation

- [x] 11.1 Implement month/week/day toggle
- [x] 11.2 Add prev/next navigation
- [x] 11.3 Add "Today" button
- [x] 11.4 Display current date range in header
- [x] 11.5 Fetch tasks for visible date range

## 12. Calendar Task Display

- [x] 12.1 Position tasks on due_date
- [x] 12.2 Option to use start_date instead
- [x] 12.3 Show task title on calendar cell
- [x] 12.4 Color-code by status or priority
- [x] 12.5 Handle multiple tasks per day (stacking)
- [x] 12.6 Click task to open details panel

## 13. Calendar Drag-and-Drop

- [x] 13.1 Enable task dragging to different dates
- [x] 13.2 Update due_date on drop
- [x] 13.3 Visual feedback during drag
- [x] 13.4 Support multi-day task display (start to due)

## 14. Calendar Filtering

- [x] 14.1 Add filter bar for calendar
- [x] 14.2 Filter by assignee
- [x] 14.3 Filter by status
- [ ] 14.4 Filter by labels
- [x] 14.5 Persist calendar filters

## 15. Shared Task Details Panel

# Tasks: Add Board Views - Table, Kanban & Calendar

## 1. Database Schema & Preferences

- [x] 1.1 Create `user_board_view_preferences` table (user_id, board_id, preferred_view, kanban_group_by, calendar_mode, filters JSON, created_at, updated_at)
- [x] 1.2 Add unique constraint on (user_id, board_id)
- [x] 1.3 Create UserBoardViewPreference model

## 2. View Preferences API

- [x] 2.1 GET /api/boards/{board}/view-preferences (get user's preferences)
- [x] 2.2 PATCH /api/boards/{board}/view-preferences (update preferences)
- [x] 2.3 Create ViewPreferenceResource

## 3. Task API Enhancements

- [x] 3.1 Add view parameter to GET /api/boards/{board}/tasks
- [x] 3.2 Support date range filters (start, end) for calendar
- [ ] 3.3 Add grouping option for Kanban (group_by=status)
- [ ] 3.4 Optimize queries for each view type

## 4. Angular View Switcher

- [x] 4.1 Create ViewSwitcherComponent (Table | Kanban | Calendar)
- [x] 4.2 Persist selected view in preferences
- [x] 4.3 Integrate with route parameters (?view=kanban)
- [x] 4.4 Create view icons and toggle UI

## 5. View Preference Service

- [x] 5.1 Create ViewPreferenceService
- [x] 5.2 Implement preference loading on board open
- [x] 5.3 Implement preference saving on change
- [x] 5.4 Cache preferences locally

## 6. Kanban View Component

- [x] 6.1 Create KanbanViewComponent container
- [x] 6.2 Create KanbanColumnComponent
- [x] 6.3 Create KanbanCardComponent
- [x] 6.4 Implement column grouping by status field
- [x] 6.5 Style columns with status colors

## 7. Kanban Drag-and-Drop

- [x] 7.1 Integrate Angular CDK DragDropModule
- [x] 7.2 Implement card drag within column (reorder)
- [x] 7.3 Implement card drag between columns (status change)
- [x] 7.4 Add visual feedback during drag
- [x] 7.5 Sync status change to backend
- [x] 7.6 Optimistic update with rollback

## 8. Kanban Card Design

- [x] 8.1 Display task title
- [x] 8.2 Show assignee avatar
- [x] 8.3 Show priority indicator
- [x] 8.4 Show due date (highlight overdue)
- [x] 8.5 Show label chips
- [x] 8.6 Add quick actions (edit, archive)
- [x] 8.7 Click to open details panel

## 9. Kanban Configuration

- [x] 9.1 Allow selecting group-by column (status default)
- [x] 9.2 Support grouping by other columns (priority, assignee)
- [x] 9.3 Persist group-by preference
- [x] 9.4 Add column collapse/expand

## 10. Calendar View Component

- [x] 10.1 Create CalendarViewComponent container
- [x] 10.2 Create CalendarMonthComponent
- [x] 10.3 Create CalendarWeekComponent
- [x] 10.4 Create CalendarDayComponent
- [x] 10.5 Create CalendarEventChip for tasks

## 11. Calendar Navigation

- [x] 11.1 Implement month/week/day toggle
- [x] 11.2 Add prev/next navigation
- [x] 11.3 Add "Today" button
- [x] 11.4 Display current date range in header
- [x] 11.5 Fetch tasks for visible date range

## 12. Calendar Task Display

- [x] 12.1 Position tasks on due_date
- [x] 12.2 Option to use start_date instead
- [x] 12.3 Show task title on calendar cell
- [x] 12.4 Color-code by status or priority
- [x] 12.5 Handle multiple tasks per day (stacking)
- [x] 12.6 Click task to open details panel

## 13. Calendar Drag-and-Drop

- [x] 13.1 Enable task dragging to different dates
- [x] 13.2 Update due_date on drop
- [x] 13.3 Visual feedback during drag
- [x] 13.4 Support multi-day task display (start to due)

## 14. Calendar Filtering

- [x] 14.1 Add filter bar for calendar
- [x] 14.2 Filter by assignee
- [x] 14.3 Filter by status
- [ ] 14.4 Filter by labels
- [x] 14.5 Persist calendar filters

## 15. Shared Task Details Panel

- [x] 15.1 Reuse TaskDetailsPanelComponent across views
- [x] 15.2 Open panel on task click in any view
- [x] 15.3 Update all views when task is edited in panel

## 16. Testing & Validation

- [ ] 16.1 PHPUnit tests for view preferences
- [x] 16.2 Angular unit tests for ViewSwitcher
- [x] 16.3 Angular unit tests for KanbanView
- [x] 16.4 Angular unit tests for CalendarView
- [ ] 16.5 E2E test: switch views, drag in Kanban, drag in Calendar
