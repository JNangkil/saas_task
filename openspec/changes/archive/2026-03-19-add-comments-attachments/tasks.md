# Tasks: Add Comments, File Attachments & Mentions

## 1. Comments Database

- [x] 1.1 Create comments table
- [x] 1.2 Create Comment model with relationships
- [x] 1.3 Add indexes for task_id, user_id

## 2. Comments API

- [x] 2.1 GET /api/tasks/{task}/comments
- [x] 2.2 POST /api/tasks/{task}/comments
- [x] 2.3 PATCH /api/comments/{comment}
- [x] 2.4 DELETE /api/comments/{comment}
- [x] 2.5 Create CommentResource

## 3. Comment Validation

- [x] 3.1 Body required, max length
- [x] 3.2 Edit time limit (optional)
- [x] 3.3 Authorization checks

## 4. Attachments Database

- [x] 4.1 Create attachments table
- [x] 4.2 Create Attachment model
- [x] 4.3 Configure storage disk

## 5. Attachments API

- [x] 5.1 POST /api/tasks/{task}/attachments
- [x] 5.2 DELETE /api/attachments/{attachment}
- [x] 5.3 GET /api/attachments/{attachment}/download

## 6. File Upload Logic

- [x] 6.1 Validate file type and size
- [x] 6.2 Store file securely
- [x] 6.3 Generate signed download URLs
- [x] 6.4 Handle upload errors

## 7. Mentions Parsing

- [ ] 7.1 Parse @username from comment body
- [ ] 7.2 Validate mentioned users are workspace members
- [ ] 7.3 Store mention references
- [ ] 7.4 Trigger mention notifications

## 8. Angular Comments Service

- [x] 8.1 Create CommentService (integrated in TaskService)
- [x] 8.2 CRUD operations for comments
- [x] 8.3 Real-time comment updates

## 9. Comment Section UI

- [x] 9.1 Create CommentSectionComponent (integrated in TaskDetailsPanel)
- [x] 9.2 Comment input with editor
- [x] 9.3 Comment list display
- [x] 9.4 Edit and delete actions

## 10. Mention Autocomplete

- [ ] 10.1 Create MentionAutocompleteComponent
- [ ] 10.2 Trigger on @ character
- [ ] 10.3 Search workspace members
- [ ] 10.4 Insert mention on select

## 11. Attachments UI

- [x] 11.1 Create AttachmentUploadComponent (integrated in TaskDetailsPanel)
- [x] 11.2 Drag-and-drop zone
- [x] 11.3 Upload progress indicator
- [x] 11.4 Attachment list with icons

## 12. Testing

- [ ] 12.1 PHPUnit tests for comments
- [ ] 12.2 PHPUnit tests for attachments
- [ ] 12.3 Angular component tests

## Completed Implementation Details

### Backend Implementation
- Created migration for `task_comments` table with proper foreign keys and indexes
- Created migration for `attachments` table with support for both task and comment attachments
- Implemented `Attachment` model with helpful methods (isImage, isPdf, humanReadableSize, etc.)
- Added relationship methods to Task and TaskComment models for attachments
- Created `AttachmentController` with full CRUD operations
- Added `AttachmentResource` for API responses
- Updated API routes for attachments

### Frontend Implementation
- Added `Attachment` interface to TypeScript models
- Updated `Task` and `TaskComment` interfaces to include attachments
- Added attachment methods to `TaskService` (upload, delete, get download URL)
- Implemented full attachment UI in `TaskDetailsPanelComponent`:
  - Drag-and-drop file upload area
  - Multiple file selection support
  - Image thumbnails for image files
  - File type icons (PDF, generic)
  - Download and delete actions
  - Upload progress indicator
  - Proper error handling
- Added comprehensive CSS styling for attachment UI

### Features Implemented
1. **File Upload**:
   - Support for all file types
   - 10MB file size limit
   - Multiple file upload at once
   - Drag-and-drop support

2. **Attachment Management**:
   - View attachments with thumbnails for images
   - Download attachments
   - Delete attachments (with confirmation)
   - Shows file size and upload metadata

3. **Security**:
   - Tenant-isolated file storage
   - Authorization checks for access
   - Secure file download URLs

4. **User Experience**:
   - Clean, intuitive UI
   - Hover effects and transitions
   - Responsive design
   - Visual feedback for upload progress
