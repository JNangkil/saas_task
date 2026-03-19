## ADDED Requirements

### Requirement: BoardTemplate Entity
The system SHALL provide a BoardTemplate entity for creating boards from predefined configurations. Each BoardTemplate SHALL have the following attributes:
- **id**: Unique identifier (UUID)
- **tenant_id**: Foreign key to tenant (nullable for global templates)
- **name**: Template name (required, max 100 characters)
- **description**: Template description (nullable, max 500 characters)
- **icon**: Template icon identifier
- **config**: JSON object containing template configuration
- **is_global**: Whether template is system-provided (boolean)
- **is_published**: Whether template is visible to tenant (boolean)
- **created_by**: Foreign key to creating user (nullable for global)
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### Scenario: Create tenant template
- **WHEN** an admin saves a board as template
- **THEN** a BoardTemplate record is created
- **AND** tenant_id is set to current tenant
- **AND** is_global is false

---

### Requirement: Template Configuration Schema
The system SHALL store template configuration as structured JSON.

**Config Structure:**
```json
{
  "columns": [
    {
      "name": "Status",
      "type": "status",
      "position": 1,
      "width": 150,
      "options": {
        "statuses": [
          {"id": "todo", "label": "To Do", "color": "#9CA3AF"},
          {"id": "in_progress", "label": "In Progress", "color": "#3B82F6"},
          {"id": "done", "label": "Done", "color": "#10B981"}
        ],
        "default_value": "todo"
      }
    },
    {
      "name": "Priority",
      "type": "priority",
      "position": 2,
      "options": {}
    },
    {
      "name": "Assignee",
      "type": "user",
      "position": 3
    },
    {
      "name": "Due Date",
      "type": "date",
      "position": 4
    }
  ],
  "sample_tasks": [
    {
      "title": "Welcome to your new board!",
      "description": "Get started by adding tasks",
      "status": "todo",
      "position": 1
    }
  ],
  "settings": {
    "include_sample_tasks": false,
    "default_view": "table"
  }
}
```

#### Scenario: Validate template config
- **WHEN** a template is created/updated
- **THEN** the config is validated against the schema
- **AND** invalid configs are rejected with specific errors

---

### Requirement: Default System Templates
The system SHALL provide pre-built global templates.

| Template | Description | Columns |
|----------|-------------|---------|
| Simple To-Do | Basic task tracking | Status (To Do/Done), Due Date |
| Project Board | Standard project management | Status (5 states), Priority, Assignee, Due Date |
| Marketing Sprint | Marketing campaign tracking | Status, Priority, Assignee, Due Date, Labels |
| Bug Tracker | Software bug tracking | Status (New/Triaged/In Progress/Testing/Closed), Priority, Assignee |
| Personal Tasks | Minimal personal board | Status, Due Date, Priority |

#### Scenario: Seed global templates
- **WHEN** the application is initialized
- **THEN** default global templates are seeded
- **AND** templates have tenant_id = NULL and is_global = true

---

### Requirement: Template API Endpoints
The system SHALL expose REST API endpoints for template management.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/board-templates | Yes | List available templates |
| GET | /api/board-templates/{template} | Yes | Get template details |
| POST | /api/workspaces/{workspace}/board-templates | Yes | Create template from board |
| PATCH | /api/board-templates/{template} | Yes | Update template |
| DELETE | /api/board-templates/{template} | Yes | Delete template |

#### Scenario: List available templates
- **WHEN** a user requests GET /api/board-templates
- **THEN** the response includes:
  - All global templates (is_global = true)
  - Tenant templates for current tenant (is_published = true)
- **AND** templates are grouped by category

**Response Payload:**
```json
{
  "data": {
    "global": [
      {
        "id": "uuid",
        "name": "Simple To-Do",
        "description": "Basic task tracking with minimal columns",
        "icon": "check-square",
        "is_global": true,
        "column_count": 2
      }
    ],
    "tenant": [
      {
        "id": "uuid",
        "name": "Our Sprint Template",
        "description": "Custom template for our team sprints",
        "icon": "rocket",
        "is_global": false,
        "column_count": 5,
        "created_by": { "id": "uuid", "name": "Admin" }
      }
    ]
  }
}
```

#### Scenario: Get template with preview
- **WHEN** requesting GET /api/board-templates/{template}
- **THEN** full template config is returned
- **AND** includes column definitions for preview

---

### Requirement: Create Template from Board
The system SHALL support creating templates from existing boards.

**Request Payload (POST /api/workspaces/{workspace}/board-templates):**
```json
{
  "source_board_id": "board-uuid",
  "name": "Our Sprint Template",
  "description": "Template based on Q1 Marketing board",
  "icon": "rocket",
  "include_sample_tasks": false,
  "is_published": true
}
```

#### Scenario: Create template from board
- **WHEN** an admin creates a template from a board
- **THEN** column configurations are extracted
- **AND** column options (statuses, etc.) are copied
- **AND** optionally sample tasks are included

#### Scenario: Template excludes task data
- **WHEN** creating a template without include_sample_tasks
- **THEN** no actual task data is copied
- **AND** only structure is preserved

#### Scenario: Authorization for template creation
- **WHEN** a workspace Member tries to create a template
- **THEN** HTTP 403 Forbidden is returned
- **AND** only Admin/Owner can create templates

---

### Requirement: Apply Template to Board
The system SHALL support applying templates when creating boards.

#### Scenario: Create board from template
- **WHEN** a board is created with template_id specified
- **THEN** columns from template config are created
- **AND** column options (statuses, etc.) are applied
- **AND** sample tasks created if enabled

**Template Application Logic:**
1. Create board with provided name/color/icon
2. For each column in template.config.columns:
   - Create BoardColumn with name, type, options
   - Set position as specified
3. If include_sample_tasks AND template has sample_tasks:
   - Create tasks with specified properties

#### Scenario: Template with sample tasks
- **WHEN** creating board with include_sample_tasks = true
- **THEN** sample tasks from template are created
- **AND** tasks have correct status and position

---

### Requirement: Template Authorization
The system SHALL enforce access control for templates.

#### Scenario: Global template access
- **WHEN** any authenticated user requests a global template
- **THEN** access is granted

#### Scenario: Tenant template access
- **WHEN** a user from tenant A requests a template from tenant B
- **THEN** HTTP 403 Forbidden is returned

#### Scenario: Unpublished template visibility
- **WHEN** a template has is_published = false
- **THEN** only the creator can see and use it

#### Scenario: Delete template authorization
- **WHEN** a non-creator tries to delete a tenant template
- **THEN** only Admin/Owner can delete
- **AND** global templates cannot be deleted by tenants
