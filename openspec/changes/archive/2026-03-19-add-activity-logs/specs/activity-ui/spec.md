## ADDED Requirements

### Requirement: Task Activity Section
The Angular application SHALL display activity in task details panel.

#### Scenario: Show task activity
- **WHEN** viewing task details
- **THEN** activity section shows recent actions

#### Scenario: Chronological order
- **WHEN** activities are displayed
- **THEN** newest activities appear first

#### Scenario: Load more activities
- **WHEN** user scrolls or clicks load more
- **THEN** older activities are fetched

---

### Requirement: Activity Item Display
The Angular application SHALL display activity items with context.

#### Scenario: Show user avatar
- **WHEN** activity has a user
- **THEN** user avatar is displayed

#### Scenario: Show timestamp
- **WHEN** activity is displayed
- **THEN** relative timestamp is shown (e.g., 2 hours ago)

#### Scenario: Show description
- **WHEN** activity is displayed
- **THEN** human-readable description is shown

---

### Requirement: Activity Description Formatting
The Angular application SHALL format activity descriptions.

#### Scenario: Status change description
- **WHEN** activity is status change
- **THEN** shows name changed status from old to new

#### Scenario: Assignment description
- **WHEN** activity is assignment change
- **THEN** shows name assigned task to assignee

#### Scenario: Creation description
- **WHEN** activity is task creation
- **THEN** shows name created task title

---

### Requirement: Activity Feed Component
The Angular application SHALL provide a general activity feed.

#### Scenario: Display activity feed
- **WHEN** user navigates to workspace activity
- **THEN** activity feed component is displayed

#### Scenario: Filter by user
- **WHEN** user filter is selected
- **THEN** only that user activities are shown

#### Scenario: Filter by action type
- **WHEN** action type filter is selected
- **THEN** only matching activities are shown

#### Scenario: Filter by date range
- **WHEN** date range is selected
- **THEN** activities in range are shown

---

### Requirement: Angular Activity Service
The Angular application SHALL provide an ActivityService.

#### Scenario: ActivityService methods
- **WHEN** the service is used
- **THEN** it provides getTaskActivity, getBoardActivity, getWorkspaceActivity methods

---

### Requirement: Activity Empty State
The Angular application SHALL handle empty activity states.

#### Scenario: No activities
- **WHEN** entity has no activities
- **THEN** empty state message is displayed

---

### Requirement: System Activity Display
The Angular application SHALL display system-generated activities.

#### Scenario: System action
- **WHEN** activity has no user
- **THEN** show as System or Automated
