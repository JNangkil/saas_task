# Design: Analytics & Reporting

## Context

This design documents the architecture for workspace and board analytics with metrics aggregation and export capabilities.

## Goals / Non-Goals

### Goals
- Calculate key task metrics efficiently
- Display charts and dashboards
- Support date range filtering
- Export data as CSV and PDF

### Non-Goals
- Predictive analytics
- Custom report builder
- Scheduled report emails

## Decisions

### D1: Metric Definitions

| Metric | Calculation |
|--------|-------------|
| Total Tasks | COUNT tasks in range |
| Completed | COUNT tasks WHERE status = done |
| Overdue | COUNT tasks WHERE due_date < now AND status != done |
| Completion Rate | completed / total * 100 |
| Avg Cycle Time | AVG(completed_at - created_at) |

### D2: API Response Structure

**Summary Response:**
```json
{
  "period": { "from": "2024-01-01", "to": "2024-01-31" },
  "totals": {
    "tasks_created": 120,
    "tasks_completed": 85,
    "tasks_overdue": 12,
    "completion_rate": 70.8
  },
  "by_status": [
    { "status": "todo", "count": 35 },
    { "status": "in_progress", "count": 20 },
    { "status": "done", "count": 85 }
  ],
  "by_assignee": [
    { "user_id": "uuid", "name": "John", "completed": 25, "overdue": 2 }
  ],
  "trends": [
    { "date": "2024-01-01", "created": 5, "completed": 3 }
  ]
}
```

### D3: Caching Strategy

- Cache summary metrics for 5 minutes
- Invalidate on task create/update/delete
- Cache key includes date range and filters

### D4: Export Formats

**CSV Export:**
- Headers: Task, Status, Assignee, Due Date, Completed, Created
- One row per task matching filters

**PDF Export:**
- Summary statistics section
- Charts rendered as images
- Generated using headless browser or PDF library

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slow queries | Medium | Caching, aggregation tables |
| Large exports | Low | Streaming, size limits |
