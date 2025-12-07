# Design: Comments, File Attachments & Mentions

## Context

This design documents the architecture for task comments, file attachments, and @mentions functionality.

## Goals / Non-Goals

### Goals
- Rich comment threads on tasks
- Secure file uploads with validation
- @mention autocomplete and notifications
- Real-time comment updates

### Non-Goals
- Nested comment replies (flat thread only)
- Comment reactions/emoji (future)
- Video/audio attachments (files only)

## Decisions

### D1: Comments Schema

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    body TEXT NOT NULL,
    mentions JSON,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEX idx_task (task_id, created_at)
);
```

**Rationale**:
- Flat thread structure (no parent_id)
- mentions JSON stores parsed user IDs
- is_deleted for soft deletion marker

### D2: Attachments Schema

```sql
CREATE TABLE attachments (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL,
    comment_id UUID,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP,
    INDEX idx_task (task_id)
);
```

### D3: Mention Parsing

**Pattern:** `@[username]` or `@username`

```php
// Parse mentions from comment body
preg_match_all('/@(\w+)/', $body, $matches);
$usernames = $matches[1];

// Validate users are workspace members
$users = User::whereIn('username', $usernames)
    ->whereHas('workspaces', fn($q) => $q->where('id', $workspaceId))
    ->get();
```

### D4: File Upload Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API       │────▶│   Storage   │
│   Upload    │     │   Validate  │     │   Service   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  Validation │
                    │  - MIME type│
                    │  - Size < 10MB
                    │  - Extension │
                    └─────────────┘
```

**Allowed File Types:**
- Documents: pdf, doc, docx, xls, xlsx, ppt, pptx
- Images: jpg, jpeg, png, gif, svg
- Text: txt, csv, json, md

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large file uploads | Medium | Size limits, chunked upload |
| Malicious files | High | Type validation, scanning |
| Mention spam | Low | Rate limiting |
