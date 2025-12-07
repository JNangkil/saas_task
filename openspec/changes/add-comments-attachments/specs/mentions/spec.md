## ADDED Requirements

### Requirement: Mention Parsing
The system SHALL parse @mentions from comment text.

#### Scenario: Extract mentions
- **WHEN** comment contains @username
- **THEN** username is extracted

#### Scenario: Multiple mentions
- **WHEN** comment contains multiple @mentions
- **THEN** all are extracted

#### Scenario: Validate workspace member
- **WHEN** mentioned user is not workspace member
- **THEN** mention is ignored

---

### Requirement: Mention Storage
The system SHALL store parsed mentions with comments.

#### Scenario: Store mention IDs
- **WHEN** comment is saved with mentions
- **THEN** mentions JSON contains user IDs

---

### Requirement: Mention Notifications
The system SHALL notify mentioned users.

#### Scenario: Notify on mention
- **WHEN** user is mentioned in comment
- **THEN** they receive notification

#### Scenario: Notification content
- **WHEN** mention notification is sent
- **THEN** includes commenter, task, and comment preview

---

### Requirement: Mention Autocomplete UI
The Angular application SHALL provide @mention autocomplete.

#### Scenario: Trigger on at symbol
- **WHEN** user types @ in comment input
- **THEN** autocomplete dropdown appears

#### Scenario: Search members
- **WHEN** typing after @
- **THEN** workspace members are filtered

#### Scenario: Show user info
- **WHEN** autocomplete is open
- **THEN** shows avatar and name

#### Scenario: Insert mention
- **WHEN** user selects from autocomplete
- **THEN** @username is inserted

---

### Requirement: Mention Display
The Angular application SHALL render mentions distinctly.

#### Scenario: Highlight mentions
- **WHEN** comment with mentions is displayed
- **THEN** @mentions are highlighted

#### Scenario: Link to profile
- **WHEN** user clicks mention
- **THEN** links to mentioned user
