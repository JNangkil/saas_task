## ADDED Requirements

### Requirement: Task Table Component
The Angular application SHALL provide a TaskTableComponent for displaying tasks in a board as a spreadsheet-style table.

#### Scenario: Display task table
- **WHEN** a user navigates to a board view
- **THEN** a table displays with columns:
  - Checkbox (for selection)
  - Task name
  - Status
  - Priority
  - Assignee
  - Labels
  - Due Date
  - (Custom columns as configured)
- **AND** tasks are ordered by position

#### Scenario: Column headers with sort
- **WHEN** a user clicks a column header
- **THEN** tasks are sorted by that column
- **AND** sort direction toggles on repeated clicks
- **AND** sort indicator arrow shows direction

#### Scenario: Loading state
- **WHEN** tasks are loading
- **THEN** skeleton rows are displayed
- **AND** loading indicator appears

#### Scenario: Empty state
- **WHEN** board has no tasks
- **THEN** empty state message is displayed
- **AND** "Create First Task" button is shown

---

### Requirement: Task Row Component
The Angular application SHALL provide a TaskRowComponent for individual task rows.

#### Scenario: Display task row
- **WHEN** a task is rendered in the table
- **THEN** each cell displays the appropriate field value
- **AND** assignee shows avatar + name
- **AND** labels show as colored chips
- **AND** overdue tasks highlight due date in red

#### Scenario: Row hover actions
- **WHEN** a user hovers over a task row
- **THEN** action icons appear on the right:
  - Open details (expand icon)
  - Duplicate
  - Archive/Delete (trash icon)

#### Scenario: Row selection
- **WHEN** a user clicks the checkbox
- **THEN** the row is selected
- **AND** selection state is tracked in component

---

### Requirement: Inline Editing
The Angular application SHALL support inline editing for task fields directly in the table.

#### Scenario: Inline title editing
- **WHEN** a user clicks on a task title
- **THEN** the cell becomes an editable input
- **AND** pressing Enter saves the change
- **AND** pressing Escape cancels editing
- **AND** clicking outside saves the change

#### Scenario: Inline status editing
- **WHEN** a user clicks on status badge
- **THEN** a dropdown appears with status options
- **AND** selecting an option updates immediately

#### Scenario: Inline priority editing
- **WHEN** a user clicks on priority badge
- **THEN** a dropdown appears with priority options
- **AND** each option shows color indicator

#### Scenario: Inline assignee editing
- **WHEN** a user clicks on assignee cell
- **THEN** a dropdown appears with workspace members
- **AND** dropdown includes search/filter
- **AND** can clear assignee (unassign)

#### Scenario: Inline due date editing
- **WHEN** a user clicks on due date cell
- **THEN** a date picker appears
- **AND** clear button removes due date

#### Scenario: Inline label editing
- **WHEN** a user clicks on labels cell
- **THEN** a multi-select dropdown appears
- **AND** shows available labels with colors
- **AND** allows selecting/deselecting labels

#### Scenario: Optimistic update
- **WHEN** an inline edit is made
- **THEN** UI updates immediately
- **AND** API request is sent
- **AND** on failure, UI reverts and shows error toast

---

### Requirement: Task Details Side Panel
The Angular application SHALL provide a TaskDetailsPanelComponent for viewing and editing full task details.

#### Scenario: Open details panel
- **WHEN** a user clicks the expand icon on a task row
- **THEN** a side panel slides in from the right
- **AND** displays full task details
- **AND** the table remains visible (shrinks)

#### Scenario: Panel content
- **WHEN** the panel is open
- **THEN** it displays:
  - Task title (editable)
  - Status and priority selectors
  - Assignee selector
  - Due date and start date pickers
  - Labels selector
  - Rich text description editor
  - Custom fields section
  - Activity log section (when available)
  - Comments section (placeholder)
  - Attachments section (placeholder)

#### Scenario: Rich text description
- **WHEN** editing description
- **THEN** a rich text editor is available
- **AND** supports bold, italic, lists, links, code

#### Scenario: Close panel
- **WHEN** a user clicks the X or presses Escape
- **THEN** the panel closes
- **AND** the table returns to full width

---

### Requirement: Task Angular Service
The Angular application SHALL provide a TaskService for API integration.

```typescript
interface ITask {
  id: string;
  board_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  start_date?: string;
  position: number;
  archived_at?: string;
  assignee?: IUserSummary;
  creator: IUserSummary;
  labels: ILabel[];
  custom_fields?: Record<string, ICustomFieldValue>;
  created_at: string;
  updated_at: string;
}

interface ITaskFilters {
  status?: string[];
  priority?: string[];
  assignee_id?: string;
  due_from?: string;
  due_to?: string;
  search?: string;
  include_archived?: boolean;
  labels?: string[];
}
```

#### Scenario: TaskService methods
- **WHEN** the service is used
- **THEN** it provides:
  - getTasks(boardId, filters?, sort?, pagination?): Observable<IPaginatedTasks>
  - getTask(taskId): Observable<ITask>
  - createTask(boardId, data): Observable<ITask>
  - updateTask(taskId, data): Observable<ITask>
  - deleteTask(taskId): Observable<void>
  - archiveTask(taskId): Observable<ITask>
  - restoreTask(taskId): Observable<ITask>
  - duplicateTask(taskId, options?): Observable<ITask>
  - updatePosition(taskId, afterId?, beforeId?): Observable<ITask>

#### Scenario: Optimistic update helper
- **WHEN** using updateTaskOptimistic(taskId, field, value)
- **THEN** local state updates immediately
- **AND** API call happens in background
- **AND** rollback occurs on failure

---

### Requirement: Task State Management
The Angular application SHALL manage task state for the current board.

#### Scenario: Load tasks for board
- **WHEN** user navigates to a board
- **THEN** tasks are fetched with default filters
- **AND** stored in component/service state

#### Scenario: Track selection state
- **WHEN** tasks are selected
- **THEN** selectedTaskIds array is maintained
- **AND** used for bulk actions

#### Scenario: Infinite scroll loading
- **WHEN** user scrolls near bottom of task list
- **THEN** next page of tasks is fetched
- **AND** appended to existing list
- **AND** loading indicator shown during fetch

---

### Requirement: Bulk Actions
The Angular application SHALL support bulk actions on selected tasks.

#### Scenario: Bulk action toolbar
- **WHEN** one or more tasks are selected
- **THEN** a floating toolbar appears with:
  - Selected count indicator
  - Change Status button
  - Change Priority button
  - Change Assignee button
  - Archive button
  - Delete button
  - Clear selection button

#### Scenario: Bulk status change
- **WHEN** user clicks "Change Status" and selects "done"
- **THEN** all selected tasks are updated to status "done"
- **AND** a confirmation toast shows "X tasks updated"

#### Scenario: Bulk archive
- **WHEN** user clicks "Archive" on bulk toolbar
- **THEN** confirmation modal appears
- **AND** on confirm, all selected tasks are archived
- **AND** tasks disappear from table (unless showing archived)

---

### Requirement: Drag and Drop Reordering
The Angular application SHALL support drag-and-drop reordering of tasks.

#### Scenario: Drag initiation
- **WHEN** a user drags a task row by the drag handle
- **THEN** a drag preview follows the cursor
- **AND** the original row becomes semi-transparent

#### Scenario: Drop between tasks
- **WHEN** a task is dropped between two other tasks
- **THEN** the task's position is updated
- **AND** API call updates position on backend
- **AND** UI reflects new order immediately

#### Scenario: Multi-select drag
- **WHEN** multiple tasks are selected and dragged
- **THEN** all selected tasks move together
- **AND** positions are recalculated for all

---

### Requirement: Filter UI
The Angular application SHALL provide filter controls for the task table.

#### Scenario: Filter bar
- **WHEN** viewing a board
- **THEN** a filter bar appears above/beside the table with:
  - Status filter (multi-select dropdown)
  - Priority filter (multi-select dropdown)
  - Assignee filter (user dropdown)
  - Due date range picker
  - Search input
  - "Show archived" toggle

#### Scenario: Apply filters
- **WHEN** a user selects filter values
- **THEN** task list refreshes with filtered results
- **AND** active filters are shown as chips
- **AND** "Clear all" button appears

#### Scenario: Save filter preset
- **WHEN** a user clicks "Save View"
- **THEN** current filters are saved for quick access
- **AND** saved views appear in a dropdown

---

### Requirement: Keyboard Navigation
The Angular application SHALL support keyboard navigation in the task table.

#### Scenario: Arrow key navigation
- **WHEN** a cell is focused and arrow keys are pressed
- **THEN** focus moves to adjacent cells

#### Scenario: Tab navigation
- **WHEN** Tab is pressed during editing
- **THEN** focus moves to next editable cell
- **AND** current cell is saved

#### Scenario: Enter to edit
- **WHEN** Enter is pressed on a focused cell
- **THEN** inline editing mode activates

#### Scenario: Escape to cancel
- **WHEN** Escape is pressed during editing
- **THEN** editing is cancelled
- **AND** original value is restored

---

### Requirement: Task Creation
The Angular application SHALL provide UI for creating new tasks.

#### Scenario: Quick add row
- **WHEN** table is displayed
- **THEN** an "Add task" row appears at the bottom
- **AND** clicking it reveals an inline input for title
- **AND** pressing Enter creates the task

#### Scenario: Create task modal
- **WHEN** user clicks "Add Task" button in toolbar
- **THEN** a modal opens with full task form
- **AND** includes all fields (title, description, status, etc.)
- **AND** submitting creates the task and closes modal

---

### Requirement: Error Handling
The Angular application SHALL handle task-related errors gracefully.

#### Scenario: Save failure rollback
- **WHEN** an inline edit fails to save
- **THEN** the cell value reverts to previous value
- **AND** an error toast displays the error message

#### Scenario: Load failure
- **WHEN** task list fails to load
- **THEN** error state is shown with retry button

#### Scenario: Concurrent edit warning
- **WHEN** a task is updated by another user while editing
- **THEN** a warning shows "Task was updated by another user"
- **AND** offers to reload or overwrite
