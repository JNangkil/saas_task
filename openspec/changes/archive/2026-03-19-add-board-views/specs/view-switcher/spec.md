## ADDED Requirements

### Requirement: View Types
The system SHALL support three view types for boards.

| View | Description | Primary Use Case |
|------|-------------|------------------|
| table | Spreadsheet-style dynamic table | Data entry, bulk editing |
| kanban | Card-based column view | Workflow management |
| calendar | Date-based calendar grid | Time-based planning |

#### Scenario: Default view
- **WHEN** a user opens a board without a saved preference
- **THEN** the table view is displayed by default

---

### Requirement: View Switcher Component
The Angular application SHALL provide a ViewSwitcherComponent for toggling between views.

#### Scenario: Display view toggle
- **WHEN** a board is opened
- **THEN** a view switcher displays with Table, Kanban, Calendar buttons
- **AND** the current view is highlighted

#### Scenario: Switch to Kanban view
- **WHEN** a user clicks the Kanban button
- **THEN** the view changes to Kanban layout
- **AND** the preference is saved for this board

#### Scenario: Switch to Calendar view
- **WHEN** a user clicks the Calendar button
- **THEN** the view changes to Calendar layout
- **AND** tasks are fetched for the visible date range

#### Scenario: URL reflects view
- **WHEN** switching views
- **THEN** the URL updates with view query parameter
- **AND** direct navigation to URL loads correct view

---

### Requirement: View Preferences Entity
The system SHALL store per-user, per-board view preferences.

**Attributes:**
- id: UUID Primary key
- user_id: UUID Foreign key to user
- board_id: UUID Foreign key to board
- preferred_view: enum (table, kanban, calendar)
- kanban_config: JSON Kanban-specific settings
- calendar_config: JSON Calendar-specific settings
- filters: JSON Active filters
- created_at, updated_at: timestamps

**Unique Constraint:** (user_id, board_id)

#### Scenario: Create default preference
- **WHEN** a user opens a board for the first time
- **THEN** a default preference record is created
- **AND** preferred_view is set to table

---

### Requirement: View Preferences API
The system SHALL expose REST API endpoints for view preferences.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/boards/{board}/view-preferences | Get user preferences |
| PATCH | /api/boards/{board}/view-preferences | Update preferences |

#### Scenario: Load preferences on board open
- **WHEN** a user opens a board
- **THEN** their view preferences are loaded
- **AND** the saved view is displayed

#### Scenario: Partial update preferences
- **WHEN** only preferred_view is sent in PATCH
- **THEN** only that field is updated
- **AND** other config is preserved

---

### Requirement: Shared Board State Service
The Angular application SHALL use a central BoardStateService shared across all views.

#### Scenario: State updates propagate to all views
- **WHEN** a task is updated in Kanban view
- **THEN** the change is reflected in Table and Calendar views immediately

#### Scenario: Filter changes affect all views
- **WHEN** a filter is applied
- **THEN** all views show filtered tasks

---

### Requirement: Task Details Panel Integration
The Angular application SHALL share the TaskDetailsPanelComponent across all views.

#### Scenario: Open details from any view
- **WHEN** a user clicks a task in Table, Kanban, or Calendar
- **THEN** the same details panel slides in from the right

#### Scenario: Updates reflect in current view
- **WHEN** a task is edited in the details panel
- **THEN** the change appears in the current view immediately

---

### Requirement: Angular View Preference Service
The Angular application SHALL provide a ViewPreferenceService for managing view state.

#### Scenario: ViewPreferenceService methods
- **WHEN** the service is used
- **THEN** it provides getPreferences, updatePreferences, getLastView, and setLastView methods
