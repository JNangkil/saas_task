## ADDED Requirements

### Requirement: Workspace Summary Endpoint
The system SHALL provide workspace analytics summary.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces/{workspace}/analytics/summary | Get summary |

**Query Parameters:**
- from: Start date (ISO format)
- to: End date (ISO format)
- board_id: Optional board filter

#### Scenario: Get workspace summary
- **WHEN** admin requests workspace analytics
- **THEN** summary metrics are returned

---

### Requirement: Board Summary Endpoint
The system SHALL provide board-level analytics.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/boards/{board}/analytics/summary | Get board summary |

#### Scenario: Get board summary
- **WHEN** user requests board analytics
- **THEN** board-specific metrics returned

---

### Requirement: User Productivity Endpoint
The system SHALL provide user productivity data.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces/{workspace}/analytics/user-productivity | Get productivity |

#### Scenario: Get user productivity
- **WHEN** admin requests productivity data
- **THEN** per-user metrics returned

---

### Requirement: Trends Endpoint
The system SHALL provide trend data.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces/{workspace}/analytics/trends | Get trends |

#### Scenario: Get activity trends
- **WHEN** admin requests trends
- **THEN** daily/weekly data returned

---

### Requirement: CSV Export Endpoint
The system SHALL support CSV export.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces/{workspace}/analytics/export/csv | Export CSV |

#### Scenario: Export CSV
- **WHEN** admin requests CSV export
- **THEN** downloadable CSV is returned

---

### Requirement: PDF Export Endpoint
The system SHALL support PDF export.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/workspaces/{workspace}/analytics/export/pdf | Export PDF |

#### Scenario: Export PDF
- **WHEN** admin requests PDF export
- **THEN** downloadable PDF is returned

---

### Requirement: Analytics Authorization
The system SHALL restrict analytics access.

#### Scenario: Admin access required
- **WHEN** non-admin requests workspace analytics
- **THEN** HTTP 403 Forbidden

#### Scenario: Board analytics access
- **WHEN** workspace member requests board analytics
- **THEN** access is granted
