## ADDED Requirements

### Requirement: Board List Component
The Angular application SHALL provide a BoardListComponent for displaying workspace boards.

#### Scenario: Display board grid
- **WHEN** a user navigates to workspace boards
- **THEN** boards are displayed as a grid of cards
- **AND** each card shows: name, color, icon, task count
- **AND** favorite star toggle is visible

#### Scenario: Display board list view
- **WHEN** user toggles to list view
- **THEN** boards are displayed as a table
- **AND** shows: name, description, task count, created date

#### Scenario: Filter by status
- **WHEN** user selects "Archived" tab
- **THEN** only archived boards are shown
- **AND** "Active" tab shows non-archived boards

#### Scenario: Search boards
- **WHEN** user types in search input
- **THEN** boards are filtered by name
- **AND** filtering is instant (client-side for small sets)

#### Scenario: Favorites section
- **WHEN** user has favorited boards
- **THEN** favorites appear in a "Starred" section at top

---

### Requirement: Create Board Modal
The Angular application SHALL provide a CreateBoardModalComponent for creating new boards.

#### Scenario: Open create modal
- **WHEN** user clicks "Create Board" button
- **THEN** a modal dialog opens with creation form

#### Scenario: Workspace selection
- **WHEN** user has access to multiple workspaces
- **THEN** a workspace selector dropdown is shown
- **AND** current workspace is pre-selected

#### Scenario: Board name input
- **WHEN** filling the form
- **THEN** name field is required
- **AND** shows validation error if empty on submit

#### Scenario: Color picker
- **WHEN** clicking color selector
- **THEN** a palette of preset colors is shown
- **AND** selected color previews on board card

#### Scenario: Icon selector
- **WHEN** clicking icon selector
- **THEN** a grid of available icons is shown
- **AND** selected icon displays on board card

#### Scenario: Template selection
- **WHEN** in create flow
- **THEN** user can choose:
  - "Blank Board" (no template)
  - Global templates (categorized)
  - Tenant templates

#### Scenario: Template preview
- **WHEN** user selects a template
- **THEN** preview shows:
  - Template description
  - List of columns that will be created
  - Toggle for including sample tasks

#### Scenario: Create blank board
- **WHEN** user creates with "Blank Board" selected
- **THEN** board is created with default columns only
- **AND** user is navigated to new board

#### Scenario: Create from template
- **WHEN** user creates with a template selected
- **THEN** board is created with template configuration
- **AND** columns and options are applied

---

### Requirement: Board Settings Page
The Angular application SHALL provide a BoardSettingsComponent for managing board configuration.

#### Scenario: Navigate to settings
- **WHEN** user clicks settings icon on a board
- **THEN** board settings page/panel opens

#### Scenario: Edit board name
- **WHEN** user changes board name
- **THEN** name updates on save
- **AND** validation ensures name is not empty

#### Scenario: Edit board description
- **WHEN** user edits description
- **THEN** description is saved via API

#### Scenario: Change board color
- **WHEN** user selects a different color
- **THEN** board color updates
- **AND** reflects in list and sidebar

#### Scenario: Change board icon
- **WHEN** user selects a different icon
- **THEN** board icon updates

#### Scenario: Archive board action
- **WHEN** user clicks "Archive Board"
- **THEN** confirmation dialog appears
- **AND** on confirm, board is archived
- **AND** user is redirected to board list

#### Scenario: Restore archived board
- **WHEN** viewing archived board settings
- **THEN** "Restore Board" button is available
- **AND** clicking restores the board

#### Scenario: Delete board action
- **WHEN** user clicks "Delete Board"
- **THEN** warning dialog explains permanent deletion
- **AND** requires typing board name to confirm
- **AND** on confirm, board is deleted

#### Scenario: Save as template
- **WHEN** user clicks "Save as Template"
- **THEN** a modal opens to configure template
- **AND** user provides name and description
- **AND** template is created from board

---

### Requirement: Board Sidebar Integration
The Angular application SHALL integrate boards into the sidebar navigation.

#### Scenario: Show favorites in sidebar
- **WHEN** user has favorite boards
- **THEN** a "Favorites" section shows in sidebar
- **AND** lists favorited board names with icons

#### Scenario: Show recent boards
- **WHEN** user has accessed boards recently
- **THEN** a "Recent" section shows last 5 accessed

#### Scenario: Workspace boards list
- **WHEN** viewing workspace in sidebar
- **THEN** boards expandable list is available
- **AND** shows board names with color dots

#### Scenario: Quick board creation
- **WHEN** user clicks "+" in boards section
- **THEN** create board modal opens

---

### Requirement: Angular Board Service
The Angular application SHALL provide a BoardService for board operations.

```typescript
interface IBoard {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  type: 'standard' | 'personal';
  is_archived: boolean;
  is_favorite: boolean;
  task_count: number;
  created_at: string;
  updated_at: string;
}

interface IBoardCreateRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  type?: 'standard' | 'personal';
  template_id?: string;
  include_sample_tasks?: boolean;
}
```

#### Scenario: BoardService methods
- **WHEN** the service is used
- **THEN** it provides:
  - getBoards(workspaceId, filters?): Observable<IBoard[]>
  - getBoard(boardId): Observable<IBoard>
  - createBoard(workspaceId, data): Observable<IBoard>
  - updateBoard(boardId, data): Observable<IBoard>
  - deleteBoard(boardId): Observable<void>
  - archiveBoard(boardId): Observable<IBoard>
  - restoreBoard(boardId): Observable<IBoard>
  - favoriteBoard(boardId): Observable<void>
  - unfavoriteBoard(boardId): Observable<void>
  - getFavoriteBoards(): Observable<IBoard[]>

---

### Requirement: Angular Template Service
The Angular application SHALL provide a BoardTemplateService for template operations.

```typescript
interface IBoardTemplate {
  id: string;
  name: string;
  description?: string;
  icon: string;
  is_global: boolean;
  column_count: number;
  config?: IBoardTemplateConfig;
}

interface IBoardTemplateConfig {
  columns: IColumnConfig[];
  sample_tasks?: ISampleTask[];
  settings?: {
    include_sample_tasks: boolean;
  };
}
```

#### Scenario: BoardTemplateService methods
- **WHEN** the service is used
- **THEN** it provides:
  - getTemplates(): Observable<{global: IBoardTemplate[], tenant: IBoardTemplate[]}>
  - getTemplate(templateId): Observable<IBoardTemplate>
  - createTemplate(workspaceId, data): Observable<IBoardTemplate>
  - updateTemplate(templateId, data): Observable<IBoardTemplate>
  - deleteTemplate(templateId): Observable<void>

---

### Requirement: Board Navigation
The Angular application SHALL handle board navigation and state.

#### Scenario: Navigate to board
- **WHEN** user clicks a board card or link
- **THEN** route changes to /boards/{boardId}
- **AND** board task table loads

#### Scenario: Board not found
- **WHEN** navigating to non-existent board
- **THEN** 404 page is shown
- **AND** link to workspace boards is provided

#### Scenario: Board archived redirect
- **WHEN** navigating to archived board
- **THEN** banner shows "This board is archived"
- **AND** option to restore is available to admins
