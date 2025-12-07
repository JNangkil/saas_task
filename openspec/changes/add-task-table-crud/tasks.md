# Tasks: Add Task Table & Task CRUD

## 1. Database Schema & Migrations

- [ ] 1.1 Create `tasks` table (id, board_id, workspace_id, tenant_id, title, description, status, priority, due_date, start_date, assignee_id, created_by, position, archived_at, created_at, updated_at, deleted_at)
- [ ] 1.2 Create `task_labels` pivot table (task_id, label_id)
- [ ] 1.3 Create `labels` table (id, workspace_id, name, color, created_at)
- [ ] 1.4 Create `task_custom_values` table (id, task_id, field_key, field_value JSON, created_at, updated_at)
- [ ] 1.5 Add indexes for board_id, workspace_id, status, priority, assignee_id, position

## 2. Laravel Models & Relationships

- [ ] 2.1 Create Task model with relationships (board, workspace, assignee, creator, labels)
- [ ] 2.2 Create Label model with workspace scope
- [ ] 2.3 Create TaskCustomValue model for flexible fields
- [ ] 2.4 Add global scopes for tenant/workspace isolation
- [ ] 2.5 Create model factories for testing

## 3. Task Validation & Form Requests

- [ ] 3.1 Create StoreTaskRequest with validation rules
- [ ] 3.2 Create UpdateTaskRequest with validation rules
- [ ] 3.3 Create TaskFilterRequest for query parameters
- [ ] 3.4 Implement custom date validation (due_date >= start_date)

## 4. Task Service Layer

- [ ] 4.1 Create TaskService for business logic
- [ ] 4.2 Implement position calculation on create/reorder
- [ ] 4.3 Implement task duplication logic
- [ ] 4.4 Implement archive/restore operations

## 5. Laravel API Endpoints

- [ ] 5.1 Create TaskController with index, show, store, update, destroy
- [ ] 5.2 GET /api/boards/{board}/tasks (paginated, filtered, sorted)
- [ ] 5.3 POST /api/boards/{board}/tasks (create task)
- [ ] 5.4 GET /api/tasks/{task} (show task details)
- [ ] 5.5 PATCH /api/tasks/{task} (update task)
- [ ] 5.6 DELETE /api/tasks/{task} (soft delete/archive)
- [ ] 5.7 POST /api/tasks/{task}/duplicate (duplicate task)
- [ ] 5.8 PATCH /api/tasks/{task}/position (reorder task)
- [ ] 5.9 Create TaskResource for API response formatting

## 6. Filtering & Sorting

- [ ] 6.1 Implement status filter (status=todo,in_progress,done)
- [ ] 6.2 Implement priority filter (priority=low,medium,high,urgent)
- [ ] 6.3 Implement assignee filter (assignee_id=uuid)
- [ ] 6.4 Implement due date range filter (due_from, due_to)
- [ ] 6.5 Implement text search (search=keyword across title/description)
- [ ] 6.6 Implement sort options (sort=position,created_at,due_date,priority)
- [ ] 6.7 Implement archived filter (include_archived=true)

## 7. Angular Task Service

- [ ] 7.1 Create TaskService with CRUD methods
- [ ] 7.2 Implement pagination support with cursor/offset
- [ ] 7.3 Implement filter/sort parameter building
- [ ] 7.4 Add optimistic update helpers
- [ ] 7.5 Create task interfaces and types

## 8. Angular Task Table Component

- [ ] 8.1 Create TaskTableComponent as main container
- [ ] 8.2 Create TaskRowComponent for individual rows
- [ ] 8.3 Implement column headers with sort toggles
- [ ] 8.4 Implement row selection checkboxes
- [ ] 8.5 Add loading states and empty states

## 9. Inline Editing

- [ ] 9.1 Implement inline title editing (click to edit)
- [ ] 9.2 Implement status dropdown selector
- [ ] 9.3 Implement priority dropdown selector
- [ ] 9.4 Implement assignee dropdown with user search
- [ ] 9.5 Implement due date picker inline
- [ ] 9.6 Implement label selector with multi-select
- [ ] 9.7 Add keyboard navigation (Tab, Enter, Escape)

## 10. Task Details Side Panel

- [ ] 10.1 Create TaskDetailsPanelComponent
- [ ] 10.2 Display full task information
- [ ] 10.3 Implement rich text description editor
- [ ] 10.4 Add activity log section
- [ ] 10.5 Add comments section (placeholder for future)
- [ ] 10.6 Add attachments section (placeholder for future)
- [ ] 10.7 Implement close/minimize behavior

## 11. Bulk Actions

- [ ] 11.1 Implement bulk selection state management
- [ ] 11.2 Add bulk action toolbar (appears when items selected)
- [ ] 11.3 Implement bulk status change
- [ ] 11.4 Implement bulk delete/archive
- [ ] 11.5 Implement bulk assignee change

## 12. Drag & Drop Reordering

- [ ] 12.1 Implement drag handle on rows
- [ ] 12.2 Add visual feedback during drag
- [ ] 12.3 Update position on drop
- [ ] 12.4 Sync position to backend

## 13. Testing & Validation

- [ ] 13.1 PHPUnit tests for Task CRUD operations
- [ ] 13.2 PHPUnit tests for filtering and sorting
- [ ] 13.3 PHPUnit tests for authorization (workspace scope)
- [ ] 13.4 Angular unit tests for TaskService
- [ ] 13.5 Angular unit tests for TaskTableComponent
- [ ] 13.6 E2E test: create → edit inline → archive → filter
