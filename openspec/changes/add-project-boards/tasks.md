# Tasks: Add Project Boards & Board Templates

## 1. Database Schema & Migrations

- [ ] 1.1 Create `boards` table (id, workspace_id, tenant_id, name, description, color, icon, type, is_archived, created_by, position, created_at, updated_at, deleted_at)
- [ ] 1.2 Create `board_templates` table (id, tenant_id, name, description, icon, config JSON, is_global, is_published, created_by, created_at, updated_at)
- [ ] 1.3 Create `user_board_favorites` pivot table (user_id, board_id, created_at)
- [ ] 1.4 Add indexes for workspace_id, tenant_id, is_archived
- [ ] 1.5 Create default global templates seeder

## 2. Laravel Models & Relationships

- [ ] 2.1 Create Board model with relationships (workspace, tenant, tasks, columns, creator)
- [ ] 2.2 Create BoardTemplate model with config casting
- [ ] 2.3 Update Workspace model with boards relationship
- [ ] 2.4 Create UserBoardFavorite pivot model
- [ ] 2.5 Add model factories for testing

## 3. Board API Endpoints

- [ ] 3.1 Create BoardController with CRUD operations
- [ ] 3.2 GET /api/workspaces/{workspace}/boards (list boards)
- [ ] 3.3 POST /api/workspaces/{workspace}/boards (create board)
- [ ] 3.4 GET /api/boards/{board} (show board)
- [ ] 3.5 PATCH /api/boards/{board} (update board)
- [ ] 3.6 DELETE /api/boards/{board} (delete board)
- [ ] 3.7 POST /api/boards/{board}/archive (archive board)
- [ ] 3.8 POST /api/boards/{board}/restore (restore board)
- [ ] 3.9 Create BoardResource for API responses

## 4. Board Favorites

- [ ] 4.1 POST /api/boards/{board}/favorite (add to favorites)
- [ ] 4.2 DELETE /api/boards/{board}/favorite (remove from favorites)
- [ ] 4.3 GET /api/user/favorite-boards (list favorites)
- [ ] 4.4 Include is_favorite flag in board responses

## 5. Board Templates API

- [ ] 5.1 Create BoardTemplateController
- [ ] 5.2 GET /api/board-templates (list global + tenant templates)
- [ ] 5.3 GET /api/board-templates/{template} (show template)
- [ ] 5.4 POST /api/workspaces/{workspace}/board-templates (create from board)
- [ ] 5.5 PATCH /api/board-templates/{template} (update template)
- [ ] 5.6 DELETE /api/board-templates/{template} (delete template)

## 6. Template Application Logic

- [ ] 6.1 Create BoardFromTemplateService
- [ ] 6.2 Duplicate columns from template config
- [ ] 6.3 Apply default statuses and column options
- [ ] 6.4 Optionally create sample tasks based on template
- [ ] 6.5 Validate template config structure

## 7. Default System Templates

- [ ] 7.1 Create "Simple To-Do" template (To Do, In Progress, Done)
- [ ] 7.2 Create "Marketing Sprint" template (Backlog, Planning, In Progress, Review, Done)
- [ ] 7.3 Create "Bug Tracker" template (New, Triaged, In Progress, Testing, Closed)
- [ ] 7.4 Create "Personal Tasks" template (minimal columns)
- [ ] 7.5 Store templates as seeder data

## 8. Angular Board Service

- [ ] 8.1 Create BoardService with CRUD methods
- [ ] 8.2 Implement board filtering and sorting
- [ ] 8.3 Add template fetching methods
- [ ] 8.4 Implement favorites management
- [ ] 8.5 Create board interfaces and types

## 9. Angular Board List Component

- [ ] 9.1 Create BoardListComponent
- [ ] 9.2 Implement grid view with color/icon cards
- [ ] 9.3 Implement list view as alternative
- [ ] 9.4 Add filter tabs (All, Active, Archived)
- [ ] 9.5 Add search/filter input
- [ ] 9.6 Show favorites section at top

## 10. Create Board Modal

- [ ] 10.1 Create CreateBoardModalComponent
- [ ] 10.2 Add workspace selector (if multiple)
- [ ] 10.3 Add name, description inputs
- [ ] 10.4 Add color picker with presets
- [ ] 10.5 Add icon selector
- [ ] 10.6 Add template selector with preview
- [ ] 10.7 "Create blank" vs "Use template" toggle

## 11. Board Settings Page

- [ ] 11.1 Create BoardSettingsComponent
- [ ] 11.2 Rename board, edit description
- [ ] 11.3 Change color and icon
- [ ] 11.4 Archive/unarchive button with confirmation
- [ ] 11.5 Delete board with confirmation
- [ ] 11.6 "Save as Template" action
- [ ] 11.7 Link to column management

## 12. Sidebar Integration

- [ ] 12.1 Show favorites in sidebar
- [ ] 12.2 Recent boards section
- [ ] 12.3 Quick board switcher
- [ ] 12.4 Workspace boards expandable list

## 13. Testing & Validation

- [ ] 13.1 PHPUnit tests for Board CRUD
- [ ] 13.2 PHPUnit tests for template creation
- [ ] 13.3 PHPUnit tests for board from template
- [ ] 13.4 Angular unit tests for BoardService
- [ ] 13.5 E2E test: create board from template workflow
