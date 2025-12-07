## ADDED Requirements

### Requirement: Kanban View Component
The Angular application SHALL provide a KanbanViewComponent for card-based workflow visualization.

#### Scenario: Display Kanban board
- **WHEN** a user selects Kanban view
- **THEN** tasks are displayed as cards in columns
- **AND** columns are based on the group-by field (default: status)

#### Scenario: Column headers
- **WHEN** Kanban board is displayed
- **THEN** each column shows column name, task count, and color

#### Scenario: Empty column display
- **WHEN** a status has no tasks
- **THEN** the column still displays with placeholder

---

### Requirement: Kanban Column Component
The Angular application SHALL provide a KanbanColumnComponent for each status group.

#### Scenario: Display column with cards
- **WHEN** a column is rendered
- **THEN** all tasks with matching status are shown as cards

#### Scenario: Collapse column
- **WHEN** user clicks collapse button on column
- **THEN** column collapses to show only header

---

### Requirement: Kanban Card Component
The Angular application SHALL provide a KanbanCardComponent displaying task information.

#### Scenario: Display task card
- **WHEN** a task is rendered as a card
- **THEN** title, assignee, priority, and due date are displayed

#### Scenario: Click card to open details
- **WHEN** user clicks a card
- **THEN** TaskDetailsPanel opens with that task

---

### Requirement: Kanban Drag Within Column
The system SHALL support reordering cards within a column using Angular CDK.

#### Scenario: Drag to reorder
- **WHEN** a user drags a card within a column
- **THEN** card position updates and is persisted

---

### Requirement: Kanban Drag Between Columns
The system SHALL support moving cards between columns to change status.

#### Scenario: Drag card to different column
- **WHEN** a user drags a card to another column
- **THEN** the task status is updated

#### Scenario: Optimistic update on drag
- **WHEN** a card is dropped in a new column
- **THEN** UI updates immediately with rollback on failure

---

### Requirement: Kanban Group Configuration
The system SHALL allow configuring which column to group by.

#### Scenario: Change group-by field
- **WHEN** user selects group by priority
- **THEN** board reorganizes with priority columns

#### Scenario: Persist group preference
- **WHEN** user changes group-by
- **THEN** the preference is saved

---

### Requirement: Kanban Column Order
The system SHALL support custom column ordering.

#### Scenario: Drag to reorder columns
- **WHEN** user drags a column header
- **THEN** column order changes and is saved

---

### Requirement: Kanban Filtering
The system SHALL support filtering in Kanban view.

#### Scenario: Apply filter
- **WHEN** user applies an assignee filter
- **THEN** only matching cards appear
