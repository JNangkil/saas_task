# Change: Add Board Views - Table, Kanban & Calendar

## Why

Different workflows and users prefer different ways to visualize their tasks. This feature provides:
- **Table View**: Spreadsheet-style for detailed data entry and bulk editing
- **Kanban View**: Visual workflow with drag-and-drop status changes
- **Calendar View**: Time-based planning with due date visualization

All views share the same underlying data, enabling users to switch seamlessly based on their current needs.

## What Changes

### View Infrastructure
- **View Switcher**: Toggle between Table/Kanban/Calendar
- **Shared State**: Common task state across all views
- **View Preferences**: Persist last view per user per board

### Kanban View
- Columns based on status (or any groupable field)
- Drag-and-drop cards between columns
- Card display with key task info
- Quick actions on cards

### Calendar View
- Monthly/weekly/daily calendar
- Tasks positioned by due_date or start_date
- Drag-and-drop to change dates
- Click to open task details

### Framework (Angular)
- KanbanViewComponent with CDK drag-drop
- CalendarViewComponent with date grid
- ViewSwitcherComponent
- Shared TaskDetailsPanel

## Impact

### Affected Specs (New Capabilities)
- `view-switcher`: View toggle UI, preferences
- `kanban-view`: Kanban board component
- `calendar-view`: Calendar component

### Dependencies
- Requires `add-task-table-crud` (Task entity)
- Requires `add-dynamic-columns` (Status column for Kanban grouping)
- Requires `add-project-boards` (Board entity)

### Affected Code Areas
- **Database**: `user_board_view_preferences` table
- **Components**: KanbanBoard, CalendarView, ViewSwitcher
- **Services**: ViewPreferenceService
