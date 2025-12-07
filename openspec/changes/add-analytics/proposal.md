# Change: Add Analytics & Reporting

## Why

Teams need visibility into productivity and project health:
- Track task completion rates and overdue trends
- Identify bottlenecks and workload imbalances
- Generate reports for stakeholders

## What Changes

### Metrics Engine
- Task counts by status, assignee, date
- Completion rates and cycle times
- Activity trends over time

### Analytics Dashboards
- Workspace-level dashboard with charts
- Board-level mini dashboard
- Date range and filter controls

### Exports
- CSV export for task data
- PDF export for dashboard snapshots

## Impact

### Affected Specs (New Capabilities)
- `metrics`: Metric definitions, aggregation
- `analytics-api`: REST endpoints for data
- `analytics-ui`: Dashboard components, charts

### Dependencies
- Requires task and board features
- Uses subscription for feature gating
