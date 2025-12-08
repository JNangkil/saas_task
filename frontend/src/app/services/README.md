# Services Documentation

## TaskService

The TaskService provides a comprehensive interface for managing tasks in the application. It integrates with the Laravel TaskController API endpoints and includes full CRUD operations, filtering, sorting, and optimistic updates.

### Basic Usage

```typescript
import { TaskService } from './services/task.service';
import { Task, TaskCreate, TaskUpdate } from './models';

constructor(private taskService: TaskService) {}

// Get tasks for a workspace
this.taskService.getTasks(tenantId, workspaceId).subscribe(response => {
  console.log('Tasks:', response.data);
});

// Get tasks for a board with filters
const filters = {
  search: 'important',
  status: ['todo', 'in_progress'],
  priority: ['high']
};

this.taskService.getTasks(tenantId, workspaceId, boardId, filters).subscribe(response => {
  console.log('Filtered tasks:', response.data);
});

// Create a new task
const newTask: TaskCreate = {
  title: 'New Task',
  description: 'Task description',
  priority: 'high',
  due_date: '2023-12-31'
};

this.taskService.createTask(tenantId, workspaceId, newTask).subscribe(task => {
  console.log('Created task:', task);
});

// Update a task
const updateData: TaskUpdate = {
  title: 'Updated Task Title',
  status: 'in_progress'
};

this.taskService.updateTask(tenantId, workspaceId, taskId, updateData).subscribe(task => {
  console.log('Updated task:', task);
});

// Delete a task
this.taskService.deleteTask(tenantId, workspaceId, taskId).subscribe(response => {
  console.log('Task deleted:', response);
});

// Archive a task
this.taskService.archiveTask(tenantId, workspaceId, taskId).subscribe(response => {
  console.log('Task archived:', response);
});

// Restore an archived task
this.taskService.restoreTask(tenantId, workspaceId, taskId).subscribe(response => {
  console.log('Task restored:', response);
});

// Duplicate a task
this.taskService.duplicateTask(tenantId, workspaceId, taskId).subscribe(task => {
  console.log('Duplicated task:', task);
});

// Update task position (for drag-and-drop)
const positionUpdate = {
  position: 5,
  board_id: 2,
  status: 'in_progress'
};

this.taskService.updateTaskPosition(tenantId, workspaceId, taskId, positionUpdate).subscribe(task => {
  console.log('Task position updated:', task);
});
```

### Filtering and Sorting

The `getTasks` method supports comprehensive filtering and sorting options:

```typescript
const filters: TaskFilters = {
  search: 'search term',
  status: ['todo', 'in_progress'],
  priority: ['high', 'urgent'],
  assignee_id: [1, 2],
  creator_id: [1],
  due_date_from: '2023-12-01',
  due_date_to: '2023-12-31',
  start_date_from: '2023-12-01',
  start_date_to: '2023-12-31',
  created_at_from: '2023-11-01',
  created_at_to: '2023-12-31',
  labels: [1, 2, 3],
  include_archived: true
};

const sort: TaskSort = {
  sort_by: 'due_date',
  sort_order: 'asc'
};

this.taskService.getTasks(tenantId, workspaceId, boardId, filters, sort, page, perPage, includes);
```

### Optimistic Updates

The TaskService includes basic optimistic updates support through a BehaviorSubject:

```typescript
// Subscribe to task updates for real-time UI updates
this.taskService.taskUpdates$.subscribe(tasks => {
  // Update your component's task list
  this.tasks = tasks;
});

// Clear the local cache if needed
this.taskService.clearTaskCache();

// Get current tasks from cache
const currentTasks = this.taskService.getCurrentTasks();
```

### Error Handling

The service includes comprehensive error handling with user-friendly error messages:

```typescript
this.taskService.getTasks(tenantId, workspaceId).subscribe({
  next: response => {
    // Handle success
  },
  error: error => {
    // Error is already formatted for user display
    console.error('Task error:', error.message);
    this.showError(error.message);
  }
});
```

### Available Interfaces

The service uses the following TypeScript interfaces:

- `Task` - Main task entity
- `TaskCreate` - Interface for creating tasks
- `TaskUpdate` - Interface for updating tasks
- `TaskFilters` - Interface for filtering options
- `TaskSort` - Interface for sorting options
- `TaskPositionUpdate` - Interface for position updates
- `TasksPaginatedResponse` - Paginated response interface

All interfaces are exported from `../models` and can be imported as needed.

### API Endpoints

The service maps to the following API endpoints:

- `GET /api/tenants/{tenant}/workspaces/{workspace}/tasks` - Get tasks
- `GET /api/tenants/{tenant}/workspaces/{workspace}/boards/{board}/tasks` - Get board tasks
- `GET /api/tenants/{tenant}/workspaces/{workspace}/tasks/{task}` - Get single task
- `POST /api/tenants/{tenant}/workspaces/{workspace}/tasks` - Create task
- `PUT /api/tenants/{tenant}/workspaces/{workspace}/tasks/{task}` - Update task
- `DELETE /api/tenants/{tenant}/workspaces/{workspace}/tasks/{task}` - Delete task
- `POST /api/tenants/{tenant}/workspaces/{workspace}/tasks/{task}/archive` - Archive task
- `POST /api/tenants/{tenant}/workspaces/{workspace}/tasks/{task}/restore` - Restore task
- `POST /api/tenants/{tenant}/workspaces/{workspace}/tasks/{task}/duplicate` - Duplicate task
- `PUT /api/tenants/{tenant}/workspaces/{workspace}/tasks/{task}/position` - Update position