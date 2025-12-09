# Tasks: Add Project Boards & Board Templates

## 1. Database Schema & Migrations

- [x] 1.1 Create `boards` table (id, workspace_id, tenant_id, name, description, color, icon, type, is_archived, created_by, position, created_at, updated_at, deleted_at)
- [x] 1.2 Create `board_templates` table (id, tenant_id, name, description, icon, config JSON, is_global, is_published, created_by, created_at, updated_at)
- [x] 1.3 Create `user_board_favorites` pivot table (user_id, board_id, created_at)
- [x] 1.4 Add indexes for workspace_id, tenant_id, is_archived
- [x] 1.5 Create default global templates seeder

## 2. Laravel Models & Relationships

- [x] 2.1 Create Board model with relationships (workspace, tenant, tasks, columns, creator)
- [x] 2.2 Create BoardTemplate model with config casting
- [x] 2.3 Update Workspace model with boards relationship
- [x] 2.4 Create UserBoardFavorite pivot model
- [x] 2.5 Add model factories for testing

## 3. Board API Endpoints

- [x] 3.1 Create BoardController with CRUD operations
- [x] 3.2 GET /api/workspaces/{workspace}/boards (list boards)
- [x] 3.3 POST /api/workspaces/{workspace}/boards (create board)
- [x] 3.4 GET /api/boards/{board} (show board)
- [x] 3.5 PATCH /api/boards/{board} (update board)
- [x] 3.6 DELETE /api/boards/{board} (delete board)
- [x] 3.7 POST /api/boards/{board}/archive (archive board)
- [x] 3.8 POST /api/boards/{board}/restore (restore board)
- [x] 3.9 Create BoardResource for API responses

## 4. Board Favorites

- [x] 4.1 POST /api/boards/{board}/favorite (add to favorites)
- [x] 4.2 DELETE /api/boards/{board}/favorite (remove from favorites)
- [x] 4.3 GET /api/user/favorite-boards (list favorites)
- [x] 4.4 Include is_favorite flag in board responses

## 5. Board Templates API

- [x] 5.1 Create BoardTemplateController
- [x] 5.2 GET /api/board-templates (list global + tenant templates)
- [x] 5.3 GET /api/board-templates/{template} (show template)
- [x] 5.4 POST /api/workspaces/{workspace}/board-templates (create from board)
- [x] 5.5 PATCH /api/board-templates/{template} (update template)
- [x] 5.6 DELETE /api/board-templates/{template} (delete template)

## 6. Template Application Logic

- [x] 6.1 Create BoardFromTemplateService
- [x] 6.2 Duplicate columns from template config
- [x] 6.3 Apply default statuses and column options
- [x] 6.4 Optionally create sample tasks based on template
- [x] 6.5 Validate template config structure

## 7. Default System Templates

- [x] 7.1 Create "Simple To-Do" template (To Do, In Progress, Done)
- [x] 7.2 Create "Marketing Sprint" template (Backlog, Planning, In Progress, Review, Done)
- [x] 7.3 Create "Bug Tracker" template (New, Triaged, In Progress, Testing, Closed)
- [x] 7.4 Create "Personal Tasks" template (minimal columns)
- [x] 7.5 Store templates as seeder data

## 8. Angular Board Service

- [x] 8.1 Create BoardService with CRUD methods
- [x] 8.2 Implement board filtering and sorting
- [x] 8.3 Add template fetching methods
- [x] 8.4 Implement favorites management
- [x] 8.5 Create board interfaces and types

## 9. Angular Board List Component

- [x] 9.1 Create BoardListComponent
- [x] 9.2 Implement grid view with color/icon cards
- [x] 9.3 Implement list view as alternative
- [x] 9.4 Add filter tabs (All, Active, Archived)
- [x] 9.5 Add search/filter input
- [x] 9.6 Show favorites section at top

## 10. Create Board Modal

- [x] 10.1 Create CreateBoardModalComponent
- [x] 10.2 Add workspace selector (if multiple)
- [x] 10.3 Add name, description inputs
- [x] 10.4 Add color picker with presets
- [x] 10.5 Add icon selector
- [x] 10.6 Add template selector with preview
- [x] 10.7 "Create blank" vs "Use template" toggle

## 11. Board Settings Page

- [x] 11.1 Create BoardSettingsComponent
- [x] 11.2 Rename board, edit description
- [x] 11.3 Change color and icon
- [x] 11.4 Archive/unarchive button with confirmation
- [x] 11.5 Delete board with confirmation
- [x] 11.6 "Save as Template" action
- [x] 11.7 Link to column management

## 12. Sidebar Integration

- [x] 12.1 Show favorites in sidebar
- [x] 12.2 Recent boards section
- [x] 12.3 Quick board switcher
- [x] 12.4 Workspace boards expandable list
- [x] 12.5 Create WorkspaceLayoutComponent (Added)

## 13. Testing & Validation

- [ ] 13.1 PHPUnit tests for Board CRUD
- [ ] 13.2 PHPUnit tests for template creation
- [ ] 13.3 PHPUnit tests for board from template
- [ ] 13.4 Angular unit tests for BoardService
- [ ] 13.5 E2E test: create board from template workflow
