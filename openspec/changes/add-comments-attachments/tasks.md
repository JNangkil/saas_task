# Tasks: Add Comments, File Attachments & Mentions

## 1. Comments Database

- [ ] 1.1 Create comments table
- [ ] 1.2 Create Comment model with relationships
- [ ] 1.3 Add indexes for task_id, user_id

## 2. Comments API

- [ ] 2.1 GET /api/tasks/{task}/comments
- [ ] 2.2 POST /api/tasks/{task}/comments
- [ ] 2.3 PATCH /api/comments/{comment}
- [ ] 2.4 DELETE /api/comments/{comment}
- [ ] 2.5 Create CommentResource

## 3. Comment Validation

- [ ] 3.1 Body required, max length
- [ ] 3.2 Edit time limit (optional)
- [ ] 3.3 Authorization checks

## 4. Attachments Database

- [ ] 4.1 Create attachments table
- [ ] 4.2 Create Attachment model
- [ ] 4.3 Configure storage disk

## 5. Attachments API

- [ ] 5.1 POST /api/tasks/{task}/attachments
- [ ] 5.2 DELETE /api/attachments/{attachment}
- [ ] 5.3 GET /api/attachments/{attachment}/download

## 6. File Upload Logic

- [ ] 6.1 Validate file type and size
- [ ] 6.2 Store file securely
- [ ] 6.3 Generate signed download URLs
- [ ] 6.4 Handle upload errors

## 7. Mentions Parsing

- [ ] 7.1 Parse @username from comment body
- [ ] 7.2 Validate mentioned users are workspace members
- [ ] 7.3 Store mention references
- [ ] 7.4 Trigger mention notifications

## 8. Angular Comments Service

- [ ] 8.1 Create CommentService
- [ ] 8.2 CRUD operations for comments
- [ ] 8.3 Real-time comment updates

## 9. Comment Section UI

- [ ] 9.1 Create CommentSectionComponent
- [ ] 9.2 Comment input with editor
- [ ] 9.3 Comment list display
- [ ] 9.4 Edit and delete actions

## 10. Mention Autocomplete

- [ ] 10.1 Create MentionAutocompleteComponent
- [ ] 10.2 Trigger on @ character
- [ ] 10.3 Search workspace members
- [ ] 10.4 Insert mention on select

## 11. Attachments UI

- [ ] 11.1 Create AttachmentUploadComponent
- [ ] 11.2 Drag-and-drop zone
- [ ] 11.3 Upload progress indicator
- [ ] 11.4 Attachment list with icons

## 12. Testing

- [ ] 12.1 PHPUnit tests for comments
- [ ] 12.2 PHPUnit tests for attachments
- [ ] 12.3 Angular component tests
