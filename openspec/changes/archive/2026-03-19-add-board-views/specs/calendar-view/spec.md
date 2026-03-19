## ADDED Requirements

### Requirement: Calendar View Component
The Angular application SHALL provide a CalendarViewComponent for date-based task visualization.

#### Scenario: Display monthly calendar
- **WHEN** a user selects Calendar view
- **THEN** a monthly calendar grid is displayed with tasks on due dates

#### Scenario: Display weekly calendar
- **WHEN** user switches to week mode
- **THEN** a 7-day grid is displayed

---

### Requirement: Calendar Navigation
The Angular application SHALL provide navigation controls for the calendar.

#### Scenario: Navigate to next period
- **WHEN** user clicks next arrow
- **THEN** calendar advances and tasks for new range are fetched

#### Scenario: Go to today
- **WHEN** user clicks Today button
- **THEN** calendar navigates to current date

---

### Requirement: Calendar Mode Toggle
The Angular application SHALL provide a mode toggle for month, week, and day views.

#### Scenario: Switch calendar mode
- **WHEN** user selects Week from mode toggle
- **THEN** calendar changes to week layout

---

### Requirement: Calendar Task Display
The Angular application SHALL display tasks on calendar cells.

#### Scenario: Show task on due date
- **WHEN** a task has a due date
- **THEN** the task appears on that date cell

#### Scenario: Click task to open details
- **WHEN** user clicks a task chip in calendar
- **THEN** TaskDetailsPanel opens

---

### Requirement: Calendar Date Field Selection
The system SHALL allow choosing which date field to display.

#### Scenario: Switch to start date display
- **WHEN** user selects Show by Start Date
- **THEN** tasks are repositioned to their start date

---

### Requirement: Calendar Date Range Fetching
The system SHALL fetch tasks only for the visible date range.

#### Scenario: Fetch tasks for visible range
- **WHEN** calendar is displayed
- **THEN** API is called with start and end parameters

---

### Requirement: Calendar Drag and Drop
The system SHALL support dragging tasks to change their date.

#### Scenario: Drag task to new date
- **WHEN** user drags a task to another date
- **THEN** the due date is updated

---

### Requirement: Calendar Filtering
The system SHALL support filtering tasks in calendar view.

#### Scenario: Filter by assignee
- **WHEN** user filters by assignee
- **THEN** only that user tasks appear in calendar

---

### Requirement: Calendar Today Highlighting
The system SHALL highlight the current date.

#### Scenario: Today indicator
- **WHEN** viewing calendar that includes today
- **THEN** today cell has distinct highlighting
