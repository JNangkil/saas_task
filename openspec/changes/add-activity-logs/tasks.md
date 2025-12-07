# Tasks: Add Activity Logs & Audit Trails

## 1. Database Schema

- [ ] 1.1 Create activity_logs table
- [ ] 1.2 Add composite indexes for entity queries
- [ ] 1.3 Add index for workspace/tenant filtering
- [ ] 1.4 Create ActivityLog model with casts

## 2. Activity Service

- [ ] 2.1 Create ActivityService class
- [ ] 2.2 Create LogsActivity trait for models
- [ ] 2.3 Define action type constants
- [ ] 2.4 Implement log() method with metadata
- [ ] 2.5 Generate human-readable descriptions

## 3. Activity Integration

- [ ] 3.1 Add logging to Task CRUD operations
- [ ] 3.2 Add logging to Board CRUD operations
- [ ] 3.3 Add logging to Workspace member changes
- [ ] 3.4 Add logging to Comment operations
- [ ] 3.5 Add logging to File attachment operations
- [ ] 3.6 Add logging to Assignment changes

## 4. Activity API Endpoints

- [ ] 4.1 GET /api/tasks/{task}/activity
- [ ] 4.2 GET /api/boards/{board}/activity
- [ ] 4.3 GET /api/workspaces/{workspace}/activity
- [ ] 4.4 GET /api/tenants/{tenant}/activity
- [ ] 4.5 Create ActivityResource for responses

## 5. API Filtering & Pagination

- [ ] 5.1 Filter by user_id
- [ ] 5.2 Filter by action_type
- [ ] 5.3 Filter by date range
- [ ] 5.4 Implement cursor pagination
- [ ] 5.5 Add sorting options

## 6. Retention Policy

- [ ] 6.1 Create RetentionPolicy configuration
- [ ] 6.2 Implement cleanup command
- [ ] 6.3 Schedule cleanup job
- [ ] 6.4 Allow tenant-specific retention

## 7. Angular Activity Service

- [ ] 7.1 Create ActivityService
- [ ] 7.2 Implement activity fetching methods
- [ ] 7.3 Create IActivity interface
- [ ] 7.4 Add pagination support

## 8. Task Activity Component

- [ ] 8.1 Create TaskActivityComponent
- [ ] 8.2 Display activity in details panel
- [ ] 8.3 Show chronological list
- [ ] 8.4 Format activity descriptions
- [ ] 8.5 Show user avatar and timestamp

## 9. Activity Feed Page

- [ ] 9.1 Create ActivityFeedComponent
- [ ] 9.2 Add filter controls
- [ ] 9.3 Implement infinite scroll
- [ ] 9.4 Add date range picker
- [ ] 9.5 Add user filter dropdown

## 10. Activity Formatting

- [ ] 10.1 Create ActivityDescriptionPipe
- [ ] 10.2 Format field changes with old/new values
- [ ] 10.3 Handle all action types
- [ ] 10.4 Localization support

## 11. Testing

- [ ] 11.1 PHPUnit tests for ActivityService
- [ ] 11.2 PHPUnit tests for activity endpoints
- [ ] 11.3 Angular unit tests for components
- [ ] 11.4 E2E test: verify activity appears after actions
