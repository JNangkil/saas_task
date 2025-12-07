## ADDED Requirements

### Requirement: Task Metrics
The system SHALL calculate key task metrics for analytics.

**Metric Definitions:**
| Metric | Calculation |
|--------|-------------|
| Total Tasks | Count of tasks in date range |
| Completed | Count WHERE status = done |
| Overdue | Count WHERE due_date < now AND not done |
| Completion Rate | (completed / total) * 100 |
| Avg Cycle Time | Average days from created to completed |

#### Scenario: Calculate task totals
- **WHEN** analytics is requested with date range
- **THEN** task counts are calculated for that range

---

### Requirement: Status Breakdown
The system SHALL provide task counts by status.

#### Scenario: Group by status
- **WHEN** analytics requested
- **THEN** counts per status are returned

---

### Requirement: Assignee Breakdown
The system SHALL provide task counts by assignee.

#### Scenario: Group by assignee
- **WHEN** analytics requested
- **THEN** counts per assignee are returned with name

---

### Requirement: Activity Trends
The system SHALL calculate activity trends over time.

#### Scenario: Daily trend data
- **WHEN** trend analytics requested
- **THEN** daily created/completed counts returned

---

### Requirement: User Productivity Metrics
The system SHALL calculate per-user productivity.

**Metrics per User:**
- Tasks completed in range
- Tasks overdue
- Average cycle time

#### Scenario: Productivity by user
- **WHEN** productivity analytics requested
- **THEN** metrics per workspace user returned

---

### Requirement: Analytics Caching
The system SHALL cache analytics for performance.

#### Scenario: Cache heavy queries
- **WHEN** same analytics requested twice
- **THEN** cached result returned within TTL

#### Scenario: Cache invalidation
- **WHEN** task is created/updated/deleted
- **THEN** related cache is invalidated

---

### Requirement: Tenant Scoping
The system SHALL scope all analytics to tenant.

#### Scenario: Multi-tenant isolation
- **WHEN** analytics calculated
- **THEN** only tenant data is included
