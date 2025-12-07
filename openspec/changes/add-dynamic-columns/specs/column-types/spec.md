## ADDED Requirements

### Requirement: Column Type Registry
The system SHALL support the following column types with specific behaviors:

| Type | Description | Value Format | Filter Operators |
|------|-------------|--------------|------------------|
| text | Single-line text | `{"value": "string"}` | equals, contains, starts_with, is_empty |
| long_text | Multi-line rich text | `{"value": "html string"}` | contains, is_empty |
| status | Status with color | `{"value": "id", "label": "...", "color": "#..."}` | equals, in, not_in |
| priority | Priority level | `{"value": "id", "label": "...", "color": "#..."}` | equals, in, not_in |
| user | User reference | `{"value": "uuid", "name": "...", "avatar": "..."}` | equals, in, is_empty |
| date | Date value | `{"value": "YYYY-MM-DD"}` | equals, before, after, between, is_empty |
| labels | Multi-select tags | `{"value": ["id1", "id2"], "labels": [...]}` | contains_any, contains_all |
| number | Numeric value | `{"value": 123.45}` | equals, gt, gte, lt, lte, between |
| checkbox | Boolean | `{"value": true/false}` | is_true, is_false |
| url | URL with optional title | `{"value": "https://...", "title": "..."}` | contains, is_empty |

#### Scenario: Get column type metadata
- **WHEN** the frontend requests column type definitions
- **THEN** the system returns metadata including label, icon, default options, and supported operators

---

### Requirement: Text Column Type
The system SHALL support single-line text columns.

**Default Options:**
```json
{
  "placeholder": "",
  "max_length": 500
}
```

#### Scenario: Render text cell
- **WHEN** a text column cell is rendered
- **THEN** it displays the text value inline
- **AND** clicking activates inline text input

#### Scenario: Validate text length
- **WHEN** text exceeds max_length
- **THEN** validation error is returned

---

### Requirement: Long Text Column Type
The system SHALL support multi-line rich text columns.

**Default Options:**
```json
{
  "enable_rich_text": true,
  "max_length": 10000
}
```

#### Scenario: Render long text cell
- **WHEN** a long_text column cell is rendered
- **THEN** it shows truncated preview with expand icon
- **AND** clicking opens a modal rich text editor

#### Scenario: Rich text formatting
- **WHEN** editing long text
- **THEN** user can apply bold, italic, lists, links, and code formatting

---

### Requirement: Status Column Type
The system SHALL support status columns with customizable options.

**Default Options:**
```json
{
  "statuses": [
    {"id": "todo", "label": "To Do", "color": "#9CA3AF"},
    {"id": "in_progress", "label": "In Progress", "color": "#3B82F6"},
    {"id": "review", "label": "Review", "color": "#F59E0B"},
    {"id": "done", "label": "Done", "color": "#10B981"}
  ],
  "default_value": "todo"
}
```

#### Scenario: Render status cell
- **WHEN** a status column cell is rendered
- **THEN** it shows a colored badge with status label
- **AND** clicking opens dropdown with all status options

#### Scenario: Add custom status option
- **WHEN** admin adds a new status to column options
- **THEN** the status appears in dropdown
- **AND** existing task values remain valid

---

### Requirement: Priority Column Type
The system SHALL support priority columns with predefined levels.

**Default Options:**
```json
{
  "priorities": [
    {"id": "low", "label": "Low", "color": "#9CA3AF", "order": 1},
    {"id": "medium", "label": "Medium", "color": "#F59E0B", "order": 2},
    {"id": "high", "label": "High", "color": "#EF4444", "order": 3},
    {"id": "urgent", "label": "Urgent", "color": "#7C3AED", "order": 4}
  ],
  "default_value": null
}
```

#### Scenario: Render priority cell
- **WHEN** a priority column cell is rendered
- **THEN** it shows colored priority indicator
- **AND** can be changed via dropdown

#### Scenario: Sort by priority
- **WHEN** sorting by priority column
- **THEN** tasks are ordered by priority order value (urgent first when desc)

---

### Requirement: User/Assignee Column Type
The system SHALL support user reference columns.

**Default Options:**
```json
{
  "allow_multiple": false,
  "restrict_to_workspace": true
}
```

#### Scenario: Render user cell
- **WHEN** a user column cell is rendered
- **THEN** it shows user avatar and name
- **AND** clicking opens user selector with search

#### Scenario: User selector search
- **WHEN** typing in user selector
- **THEN** workspace members are filtered by name/email
- **AND** selected user's info is stored in value

---

### Requirement: Date Column Type
The system SHALL support date columns with optional time.

**Default Options:**
```json
{
  "include_time": false,
  "format": "YYYY-MM-DD",
  "show_relative": true,
  "highlight_overdue": true
}
```

#### Scenario: Render date cell
- **WHEN** a date column cell is rendered
- **THEN** it shows formatted date
- **AND** overdue dates are highlighted in red if enabled
- **AND** clicking opens date picker

#### Scenario: Date picker interaction
- **WHEN** date picker is opened
- **THEN** user can select date from calendar UI
- **AND** optional time picker if include_time is true

---

### Requirement: Labels Column Type
The system SHALL support multi-select label columns.

**Default Options:**
```json
{
  "labels": [
    {"id": "bug", "name": "Bug", "color": "#EF4444"},
    {"id": "feature", "name": "Feature", "color": "#10B981"},
    {"id": "enhancement", "name": "Enhancement", "color": "#3B82F6"}
  ],
  "allow_create": true
}
```

#### Scenario: Render labels cell
- **WHEN** a labels column cell is rendered
- **THEN** it shows colored label chips
- **AND** clicking opens multi-select dropdown

#### Scenario: Create new label inline
- **WHEN** user types a new label name and allow_create is true
- **THEN** a new label option is added to column
- **AND** the label is applied to the task

---

### Requirement: Number Column Type
The system SHALL support numeric columns with formatting.

**Default Options:**
```json
{
  "format": "number",
  "precision": 2,
  "prefix": "",
  "suffix": "",
  "min": null,
  "max": null
}
```

**Format Options:**
- `number`: Plain number
- `currency`: With currency symbol
- `percentage`: With % suffix

#### Scenario: Render number cell
- **WHEN** a number column cell is rendered
- **THEN** it shows formatted number (e.g., "$1,500.00")
- **AND** clicking activates numeric input

#### Scenario: Validate number range
- **WHEN** number exceeds min/max constraints
- **THEN** validation error is returned

---

### Requirement: Checkbox Column Type
The system SHALL support boolean checkbox columns.

**Default Options:**
```json
{
  "default_value": false
}
```

#### Scenario: Render checkbox cell
- **WHEN** a checkbox column cell is rendered
- **THEN** it shows a checkbox that can be toggled
- **AND** clicking immediately toggles value

---

### Requirement: URL Column Type
The system SHALL support URL columns with clickable links.

**Default Options:**
```json
{
  "show_preview": true,
  "open_in_new_tab": true
}
```

#### Scenario: Render URL cell
- **WHEN** a URL column cell is rendered
- **THEN** it shows a clickable link
- **AND** clicking the link opens in new tab
- **AND** edit icon allows changing the URL

#### Scenario: Validate URL format
- **WHEN** invalid URL is entered
- **THEN** validation error is returned

---

### Requirement: Cell Value Validation
The system SHALL validate field values according to column type and options.

#### Scenario: Required column validation
- **WHEN** a task is saved with empty required field
- **THEN** HTTP 422 is returned with validation error

#### Scenario: Type-specific validation
- **WHEN** a value doesn't match column type (e.g., text in number column)
- **THEN** HTTP 422 is returned with type mismatch error

#### Scenario: Options validation
- **WHEN** a status value is not in column options
- **THEN** HTTP 422 is returned with invalid option error
