## ADDED Requirements

### Requirement: Comment Entity
The system SHALL provide a Comment entity for task discussions.

**Attributes:**
- id: UUID primary key
- task_id: FK to task (required)
- user_id: FK to author (required)
- body: Comment text (required)
- mentions: JSON array of mentioned user IDs
- is_edited: Boolean (default false)
- is_deleted: Boolean for soft delete
- created_at, updated_at: Timestamps

#### Scenario: Create comment
- **WHEN** user posts a comment on a task
- **THEN** comment is created with body and author

---

### Requirement: Comment API Endpoints
The system SHALL expose REST API endpoints for comments.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks/{task}/comments | List comments |
| POST | /api/tasks/{task}/comments | Create comment |
| PATCH | /api/comments/{comment} | Edit comment |
| DELETE | /api/comments/{comment} | Delete comment |

#### Scenario: List task comments
- **WHEN** user requests task comments
- **THEN** comments are returned chronologically

#### Scenario: Create comment
- **WHEN** user posts comment with body
- **THEN** comment is created and returned

#### Scenario: Edit comment
- **WHEN** author edits their comment
- **THEN** body is updated and is_edited set to true

#### Scenario: Delete comment
- **WHEN** author deletes their comment
- **THEN** is_deleted is set to true
- **AND** body shows deleted marker

---

### Requirement: Comment Validation
The system SHALL validate comment content.

| Field | Rules |
|-------|-------|
| body | required, max:10000 |

#### Scenario: Empty body rejected
- **WHEN** comment body is empty
- **THEN** HTTP 422 validation error

---

### Requirement: Comment Authorization
The system SHALL enforce comment permissions.

#### Scenario: View comments with task access
- **WHEN** user has task access
- **THEN** they can view and add comments

#### Scenario: Edit own comment only
- **WHEN** non-author tries to edit comment
- **THEN** HTTP 403 Forbidden

#### Scenario: Admin can delete any
- **WHEN** workspace admin deletes comment
- **THEN** deletion is allowed

---

### Requirement: Comment Section UI
The Angular application SHALL provide a comment section.

#### Scenario: Display comments
- **WHEN** viewing task details
- **THEN** comment section shows all comments

#### Scenario: Comment input
- **WHEN** user wants to comment
- **THEN** text input area is available

#### Scenario: Show comment info
- **WHEN** comment is displayed
- **THEN** shows avatar, author, time, body

#### Scenario: Edit indicator
- **WHEN** comment was edited
- **THEN** shows edited indicator

#### Scenario: Deleted marker
- **WHEN** comment was deleted
- **THEN** shows This comment was deleted

---

### Requirement: Real-time Comment Updates
The system SHALL update comments in real-time.

#### Scenario: New comment appears
- **WHEN** another user posts comment
- **THEN** it appears without refresh
