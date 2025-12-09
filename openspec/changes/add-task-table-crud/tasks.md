# Tasks: Add Task Table & Task CRUD

## 1. Database Schema & Migrations

- [x] 1.1 Create `tasks` table (id, board_id, workspace_id, tenant_id, title, description, status, priority, due_date, start_date, assignee_id, created_by, position, archived_at, created_at, updated_at, deleted_at)
- [x] 1.2 Create `task_labels` pivot table (task_id, label_id)
- [x] 1.3 Create `labels` table (id, workspace_id, name, color, created_at)
- [x] 1.4 Create `task_custom_values` table (id, task_id, field_key, field_value JSON, created_at, updated_at)
- [x] 1.5 Add indexes for board_id, workspace_id, status, priority, assignee_id, position

## 2. Laravel Models & Relationships

- [x] 2.1 Create Task model with relationships (board, workspace, assignee, creator, labels)
- [x] 2.2 Create Label model with workspace scope
- [x] 2.3 Create TaskCustomValue model for flexible fields
- [x] 2.4 Add global scopes for tenant/workspace isolation
- [ ] 2.5 Create model factories for testing

## 3. Task Validation & Form Requests

- [x] 3.1 Create StoreTaskRequest with validation rules
- [x] 3.2 Create UpdateTaskRequest with validation rules
- [x] 3.3 Create TaskFilterRequest for query parameters
- [x] 3.4 Implement custom date validation (due_date >= start_date)

## 4. Task Service Layer

- [x] 4.1 Create TaskService for business logic
- [x] 4.2 Implement position calculation on create/reorder
- [x] 4.3 Implement task duplication logic
- [x] 4.4 Implement archive/restore operations

## 5. Laravel API Endpoints

- [x] 5.1 Create TaskController with index, show, store, update, destroy
- [x] 5.2 GET /api/boards/{board}/tasks (paginated, filtered, sorted)
- [x] 5.3 POST /api/boards/{board}/tasks (create task)
- [x] 5.4 GET /api/tasks/{task} (show task details)
- [x] 5.5 PATCH /api/tasks/{task} (update task)
- [x] 5.6 DELETE /api/tasks/{task} (soft delete/archive)
- [x] 5.7 POST /api/tasks/{task}/duplicate (duplicate task)
- [x] 5.8 PATCH /api/tasks/{task}/position (reorder task)
- [x] 5.9 Create TaskResource for API response formatting

## 6. Filtering & Sorting

- [x] 6.1 Implement status filter (status=todo,in_progress,done)
- [x] 6.2 Implement priority filter (priority=low,medium,high,urgent)
- [x] 6.3 Implement assignee filter (assignee_id=uuid)
- [x] 6.4 Implement due date range filter (due_from, due_to)
- [x] 6.5 Implement text search (search=keyword across title/description)
- [x] 6.6 Implement sort options (sort=position,created_at,due_date,priority)
- [x] 6.7 Implement archived filter (include_archived=true)

## 7. Angular Task Service

- [x] 7.1 Create TaskService with CRUD methods
- [x] 7.2 Implement pagination support with cursor/offset
- [x] 7.3 Implement filter/sort parameter building
- [x] 7.4 Add optimistic update helpers
- [x] 7.5 Create task interfaces and types

## 8. Angular Task Table Component

- [x] 8.1 Create TaskTableComponent as main container
- [x] 8.2 Create TaskRowComponent for individual rows
- [x] 8.3 Implement column headers with sort toggles
- [x] 8.4 Implement row selection checkboxes
- [x] 8.5 Add loading states and empty states

## 9. Inline Editing

- [x] 9.1 Implement inline title editing (click to edit)
- [x] 9.2 Implement status dropdown selector
- [x] 9.3 Implement priority dropdown selector
- [x] 9.4 Implement assignee dropdown with user search
- [x] 9.5 Implement due date picker inline
- [x] 9.6 Implement label selector with multi-select
- [x] 9.7 Add keyboard navigation (Tab, Enter, Escape)

## 10. Task Details Side Panel

- [x] 10.1 Create TaskDetailsPanelComponent
- [x] 10.2 Display full task information
- [x] 10.3 Implement rich text description editor
- [x] 10.4 Add activity log section
- [x] 10.5 Add comments section (placeholder for future)
- [x] 10.6 Add attachments section (placeholder for future)
- [x] 10.7 Implement close/minimize behavior

## 11. Bulk Actions

- [x] 11.1 Implement bulk selection state management
- [x] 11.2 Add bulk action toolbar (appears when items selected)
- [x] 11.3 Implement bulk status change
- [x] 11.4 Implement bulk delete/archive
- [x] 11.5 Implement bulk assignee change

## 12. Drag & Drop Reordering

- [x] 12.1 Implement drag handle on rows
- [x] 12.2 Add visual feedback during drag
- [x] 12.3 Update position on drop
- [x] 12.4 Sync position to backend

## 13. Testing & Validation

- [ ] 13.1 PHPUnit tests for Task CRUD operations
- [ ] 13.2 PHPUnit tests for filtering and sorting
- [ ] 13.3 PHPUnit tests for authorization (workspace scope)
- [x] 13.4 Angular unit tests for TaskService
- [x] 13.5 Angular unit tests for TaskTableComponent
- [ ] 13.6 E2E test: create → edit inline → archive → filter
