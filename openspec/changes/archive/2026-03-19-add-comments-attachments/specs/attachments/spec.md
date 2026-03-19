## ADDED Requirements

### Requirement: Attachment Entity
The system SHALL provide an Attachment entity for file uploads.

**Attributes:**
- id: UUID primary key
- task_id: FK to task (required)
- comment_id: FK to comment (nullable)
- file_name: Original filename (required)
- file_type: MIME type
- file_size: Size in bytes
- storage_path: Path or URL to file
- uploaded_by: FK to user
- created_at: Timestamp

#### Scenario: Attach file to task
- **WHEN** user uploads file to task
- **THEN** attachment record is created

---

### Requirement: Attachment API Endpoints
The system SHALL expose REST API endpoints for attachments.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks/{task}/attachments | List attachments |
| POST | /api/tasks/{task}/attachments | Upload attachment |
| DELETE | /api/attachments/{attachment} | Delete attachment |
| GET | /api/attachments/{attachment}/download | Download file |

#### Scenario: Upload attachment
- **WHEN** user uploads file
- **THEN** file is stored and attachment created

#### Scenario: Delete attachment
- **WHEN** uploader or admin deletes attachment
- **THEN** file and record are removed

#### Scenario: Download attachment
- **WHEN** user with access requests download
- **THEN** signed URL or file stream is returned

---

### Requirement: File Upload Validation
The system SHALL validate uploaded files.

**Allowed Types:**
- Documents: pdf, doc, docx, xls, xlsx, ppt, pptx
- Images: jpg, jpeg, png, gif, svg
- Text: txt, csv, json, md

**Size Limit:** 10MB per file

#### Scenario: Invalid type rejected
- **WHEN** user uploads exe file
- **THEN** HTTP 422 with file type error

#### Scenario: Size exceeded rejected
- **WHEN** file exceeds 10MB
- **THEN** HTTP 422 with size error

---

### Requirement: Secure File Storage
The system SHALL store files securely.

#### Scenario: Store to configured disk
- **WHEN** file is uploaded
- **THEN** stored to configured storage disk

#### Scenario: Generate signed URLs
- **WHEN** download is requested
- **THEN** signed URL with expiration is generated

---

### Requirement: Attachment UI
The Angular application SHALL provide attachment UI.

#### Scenario: Upload button
- **WHEN** in task details
- **THEN** attach file button is available

#### Scenario: Drag and drop
- **WHEN** user drags file to task
- **THEN** upload is initiated

#### Scenario: Upload progress
- **WHEN** upload is in progress
- **THEN** progress indicator is shown

#### Scenario: Attachment list
- **WHEN** task has attachments
- **THEN** list shows file name, size, icon

#### Scenario: Download link
- **WHEN** clicking attachment
- **THEN** file is downloaded
