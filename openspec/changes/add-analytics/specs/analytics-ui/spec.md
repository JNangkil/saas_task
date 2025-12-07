## ADDED Requirements

### Requirement: Workspace Dashboard
The Angular application SHALL provide a workspace analytics dashboard.

#### Scenario: Display dashboard
- **WHEN** admin navigates to workspace analytics
- **THEN** dashboard with charts is displayed

#### Scenario: Summary cards
- **WHEN** dashboard loads
- **THEN** cards show total, completed, overdue counts

---

### Requirement: Status Chart
The Angular application SHALL display tasks by status chart.

#### Scenario: Pie chart by status
- **WHEN** dashboard loads
- **THEN** pie/donut chart shows status distribution

---

### Requirement: Trend Chart
The Angular application SHALL display activity trends.

#### Scenario: Line chart for trends
- **WHEN** dashboard loads
- **THEN** line chart shows daily created/completed

---

### Requirement: Productivity Table
The Angular application SHALL display user productivity.

#### Scenario: Show productivity table
- **WHEN** dashboard loads
- **THEN** table shows per-user metrics

---

### Requirement: Date Range Filter
The Angular application SHALL provide date range filtering.

#### Scenario: Select date range
- **WHEN** user selects date range
- **THEN** all charts update with filtered data

---

### Requirement: Board Mini Dashboard
The Angular application SHALL show mini stats on boards.

#### Scenario: Board header stats
- **WHEN** viewing a board
- **THEN** header shows key metrics

---

### Requirement: Export Buttons
The Angular application SHALL provide export functionality.

#### Scenario: CSV export button
- **WHEN** user clicks Export CSV
- **THEN** CSV file is downloaded

#### Scenario: PDF export button
- **WHEN** user clicks Export PDF
- **THEN** PDF file is downloaded

---

### Requirement: Angular Analytics Service
The Angular application SHALL provide an AnalyticsService.

#### Scenario: AnalyticsService methods
- **WHEN** the service is used
- **THEN** it provides getSummary, getProductivity, getTrends, exportCSV, exportPDF methods
