## ADDED Requirements

### Requirement: Task Activity Endpoint
The system SHALL provide an endpoint for task activity history.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks/{task}/activity | Get task activity |

#### Scenario: Get task activity
- **WHEN** user requests task activity
- **THEN** chronological activity list is returned

#### Scenario: Paginated results
- **WHEN** many activities exist
- **THEN** results are paginated

---

### Requirement: Board Activity Endpoint
The system SHALL provide an endpoint for board activity history.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/boards/{board}/activity | Get board activity |

#### Scenario: Get board activity
- **WHEN** user requests board activity
- **THEN** activities for board and its tasks are returned

---

### Requirement: Workspace Activity Endpoint
The system SHALL provide an endpoint for workspace activity.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces/{workspace}/activity | Get workspace activity |

#### Scenario: Get workspace activity
- **WHEN** admin requests workspace activity
- **THEN** all workspace activities are returned with filters

---

### Requirement: Tenant Activity Endpoint
The system SHALL provide an endpoint for tenant-level activity.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tenants/{tenant}/activity | Get tenant activity |

#### Scenario: Get tenant activity
- **WHEN** tenant owner requests activity
- **THEN** all tenant activities are returned

---

### Requirement: Activity Filtering
The system SHALL support filtering activity queries.

| Filter | Type | Description |
|--------|------|-------------|
| user_id | UUID | Filter by actor |
| action_type | string | Filter by action type |
| entity_type | string | Filter by entity type |
| start_date | date | Activities after date |
| end_date | date | Activities before date |

#### Scenario: Filter by user
- **WHEN** user_id filter is provided
- **THEN** only activities by that user are returned

#### Scenario: Filter by date range
- **WHEN** start and end dates are provided
- **THEN** only activities in range are returned

---

### Requirement: Activity Response Format
The system SHALL return activities in standardized format.

#### Scenario: Activity response
- **WHEN** activities are returned
- **THEN** each includes id, action_type, description, user, timestamp

---

### Requirement: Activity Authorization
The system SHALL enforce authorization for activity endpoints.

#### Scenario: Task activity access
- **WHEN** user has task access
- **THEN** they can view task activity

#### Scenario: Workspace activity access
- **WHEN** user is workspace admin or owner
- **THEN** they can view workspace activity

#### Scenario: Tenant activity access
- **WHEN** user is tenant owner or admin
- **THEN** they can view tenant activity
