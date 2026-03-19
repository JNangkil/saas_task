# Change: Add Comments, File Attachments & Mentions

## Why

Task collaboration requires rich communication:
- Comments for discussions and updates
- File attachments for sharing documents
- @mentions for notifying specific team members

## What Changes

### Comments
- Comment thread per task
- Rich text/markdown support
- Edit and delete with markers
- Comment activity logging

### File Attachments
- Attach files to tasks or comments
- Secure file upload with validation
- Cloud or local storage support
- Download and preview links

### Mentions
- @user mention autocomplete
- Parse mentions from comment body
- Trigger notifications for mentioned users

## Impact

### Affected Specs (New Capabilities)
- `comments`: Comment entity, CRUD API, UI
- `attachments`: Attachment entity, upload flow
- `mentions`: Mention parsing, autocomplete, notifications

### Dependencies
- Requires task feature
- Integrates with notifications
- Uses real-time for live updates
