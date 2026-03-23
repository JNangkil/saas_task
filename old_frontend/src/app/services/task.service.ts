import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
    Task,
    Label,
    TaskCustomValue,
    User,
    Board,
    Workspace,
    TaskComment,
    Attachment,
    TaskFilters,
    TaskSort,
    TaskCreate,
    TaskUpdate,
    TaskPositionUpdate,
    TasksPaginatedResponse
} from '../models';

/**
 * Service for managing tasks in the application
 */
@Injectable({
    providedIn: 'root'
})
export class TaskService {
    private readonly baseUrl = '/api';
    private taskUpdatesSubject = new BehaviorSubject<Task[]>([]);
    public taskUpdates$ = this.taskUpdatesSubject.asObservable();

    constructor(
        private http: HttpClient,
        private apiService: ApiService
    ) { }

    /**
     * Get tasks for a board or workspace with filtering, sorting, and pagination
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId Optional board ID
     * @param filters Optional filtering options
     * @param sort Optional sorting options
     * @param page Page number for pagination
     * @param perPage Number of items per page
     * @param includes Array of relationships to include
     * @returns Observable<TasksPaginatedResponse> Paginated tasks response
     */
    getTasks(
        tenantId: number,
        workspaceId: number,
        boardId?: number,
        filters?: TaskFilters,
        sort?: TaskSort,
        page: number = 1,
        perPage: number = 15,
        includes: string[] = []
    ): Observable<TasksPaginatedResponse> {
        let endpoint = `tenants/${tenantId}/workspaces/${workspaceId}`;

        if (boardId) {
            endpoint += `/boards/${boardId}/tasks`;
        } else {
            endpoint += `/tasks`;
        }

        const params: any = {
            page: page.toString(),
            per_page: perPage.toString(),
            include: includes.join(',')
        };

        // Add filter parameters
        if (filters) {
            if (filters.search) params.search = filters.search;
            if (filters.status) params.status = filters.status;
            if (filters.priority) params.priority = filters.priority;
            if (filters.assignee_id) params.assignee_id = filters.assignee_id;
            if (filters.creator_id) params.creator_id = filters.creator_id;
            if (filters.due_date_from) params.due_date_from = filters.due_date_from;
            if (filters.due_date_to) params.due_date_to = filters.due_date_to;
            if (filters.start_date_from) params.start_date_from = filters.start_date_from;
            if (filters.start_date_to) params.start_date_to = filters.start_date_to;
            if (filters.created_at_from) params.created_at_from = filters.created_at_from;
            if (filters.created_at_to) params.created_at_to = filters.created_at_to;
            if (filters.labels) params.labels = filters.labels;
            if (filters.include_archived) params.include_archived = filters.include_archived;
        }

        // Add sort parameters
        if (sort) {
            if (sort.sort_by) params.sort_by = sort.sort_by;
            if (sort.sort_order) params.sort_order = sort.sort_order;
        }

        return this.apiService.get<TasksPaginatedResponse>(endpoint, { params }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Get a single task with relationships
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @param includes Array of relationships to include
     * @returns Observable<Task> Single task with relationships
     */
    getTask(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        includes: string[] = ['labels', 'custom_values', 'assignee', 'creator', 'board', 'workspace', 'comments']
    ): Observable<Task> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}`;
        const params = {
            include: includes.join(',')
        };

        return this.apiService.get<Task>(endpoint, { params }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Create a new task
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskData The task data to create
     * @returns Observable<Task> Created task
     */
    createTask(
        tenantId: number,
        workspaceId: number,
        taskData: TaskCreate
    ): Observable<Task> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks`;

        return this.apiService.post<Task>(endpoint, taskData).pipe(
            tap(newTask => {
                // Update local cache with new task for optimistic updates
                const currentTasks = this.taskUpdatesSubject.value;
                this.taskUpdatesSubject.next([...currentTasks, newTask]);
            }),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Update an existing task
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @param taskData The task data to update
     * @returns Observable<Task> Updated task
     */
    updateTask(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        taskData: TaskUpdate
    ): Observable<Task> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}`;

        return this.apiService.put<Task>(endpoint, taskData).pipe(
            tap(updatedTask => {
                // Update local cache for optimistic updates
                const currentTasks = this.taskUpdatesSubject.value;
                const updatedTasks = currentTasks.map(task =>
                    task.id === taskId ? { ...task, ...updatedTask } : task
                );
                this.taskUpdatesSubject.next(updatedTasks);
            }),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Delete a task (soft delete)
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @returns Observable<any> Delete response
     */
    deleteTask(
        tenantId: number,
        workspaceId: number,
        taskId: number
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}`;

        return this.apiService.delete<any>(endpoint).pipe(
            tap(() => {
                // Update local cache for optimistic updates
                const currentTasks = this.taskUpdatesSubject.value;
                const updatedTasks = currentTasks.filter(task => task.id !== taskId);
                this.taskUpdatesSubject.next(updatedTasks);
            }),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Archive a task
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @returns Observable<any> Archive response
     */
    archiveTask(
        tenantId: number,
        workspaceId: number,
        taskId: number
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/archive`;

        return this.apiService.post<any>(endpoint).pipe(
            tap(() => {
                // Update local cache for optimistic updates
                const currentTasks = this.taskUpdatesSubject.value;
                const updatedTasks = currentTasks.map(task =>
                    task.id === taskId ? { ...task, archived_at: new Date().toISOString() } as Task : task
                );
                this.taskUpdatesSubject.next(updatedTasks);
            }),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Restore an archived task
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @returns Observable<any> Restore response
     */
    restoreTask(
        tenantId: number,
        workspaceId: number,
        taskId: number
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/restore`;

        return this.apiService.post<any>(endpoint).pipe(
            tap(() => {
                // Update local cache for optimistic updates
                const currentTasks = this.taskUpdatesSubject.value;
                const updatedTasks = currentTasks.map(task =>
                    task.id === taskId ? { ...task, archived_at: undefined, status: 'todo' as const } as Task : task
                );
                this.taskUpdatesSubject.next(updatedTasks);
            }),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Duplicate an existing task
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID to duplicate
     * @returns Observable<Task> Duplicated task
     */
    duplicateTask(
        tenantId: number,
        workspaceId: number,
        taskId: number
    ): Observable<Task> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/duplicate`;

        return this.apiService.post<Task>(endpoint).pipe(
            tap(newTask => {
                // Update local cache with duplicated task for optimistic updates
                const currentTasks = this.taskUpdatesSubject.value;
                this.taskUpdatesSubject.next([...currentTasks, newTask]);
            }),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Update task position for drag-and-drop reordering
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @param positionData The position update data
     * @returns Observable<Task> Updated task
     */
    updateTaskPosition(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        positionData: TaskPositionUpdate
    ): Observable<Task> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/position`;

        return this.apiService.put<Task>(endpoint, positionData).pipe(
            tap(updatedTask => {
                // Update local cache for optimistic updates
                const currentTasks = this.taskUpdatesSubject.value;
                const updatedTasks = currentTasks.map(task =>
                    task.id === taskId ? { ...task, ...updatedTask } as Task : task
                );
                this.taskUpdatesSubject.next(updatedTasks);
            }),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Get comments for a task
     */
    getComments(
        tenantId: number,
        workspaceId: number,
        taskId: number
    ): Observable<TaskComment[]> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/comments`;
        return this.apiService.get<TasksPaginatedResponse>(endpoint).pipe(
            map(response => response.data as any[] as TaskComment[]),
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Add a comment to a task
     */
    addComment(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        content: string
    ): Observable<TaskComment> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/comments`;
        return this.apiService.post<TaskComment>(endpoint, { content }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Update a comment
     */
    updateComment(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        commentId: number,
        content: string
    ): Observable<TaskComment> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`;
        return this.apiService.put<TaskComment>(endpoint, { content }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Delete a comment
     */
    deleteComment(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        commentId: number
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`;
        return this.apiService.delete(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Upload an attachment to a task
     */
    uploadAttachment(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        file: File,
        commentId?: number
    ): Observable<Attachment> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/attachments`;
        const formData = new FormData();
        formData.append('file', file);
        if (commentId) {
            formData.append('task_comment_id', commentId.toString());
        }

        const httpOptions = {
            headers: new HttpHeaders({
                'Accept': 'application/json'
            })
        };

        return this.http.post<Attachment>(`${this.baseUrl}/${endpoint}`, formData, httpOptions).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Get attachment details
     */
    getAttachment(
        tenantId: number,
        workspaceId: number,
        attachmentId: number
    ): Observable<Attachment> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/attachments/${attachmentId}`;
        return this.apiService.get<Attachment>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Delete an attachment
     */
    deleteAttachment(
        tenantId: number,
        workspaceId: number,
        attachmentId: number
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/attachments/${attachmentId}`;
        return this.apiService.delete(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Get download URL for an attachment
     */
    getAttachmentDownloadUrl(
        tenantId: number,
        workspaceId: number,
        attachmentId: number
    ): string {
        return `${this.baseUrl}/tenants/${tenantId}/workspaces/${workspaceId}/attachments/${attachmentId}/download`;
    }

    /**
     * Get current tasks from the local cache
     * 
     * @returns Task[] Current tasks
     */
    getCurrentTasks(): Task[] {
        return this.taskUpdatesSubject.value;
    }

    /**
     * Clear the local task cache
     */
    clearTaskCache(): void {
        this.taskUpdatesSubject.next([]);
    }

    /**
     * Handle HTTP errors and provide user-friendly messages
     * 
     * @param error The HTTP error
     * @returns Observable<never> Error observable
     */
    private handleError(error: any): Observable<never> {
        console.error('Task Service Error:', error);

        let errorMessage = 'An unexpected error occurred while managing tasks';

        if (error.status) {
            switch (error.status) {
                case 400:
                    errorMessage = 'Invalid task data provided';
                    break;
                case 401:
                    errorMessage = 'You are not authorized to perform this action';
                    break;
                case 403:
                    errorMessage = 'You do not have permission to manage this task';
                    break;
                case 404:
                    errorMessage = 'The requested task was not found';
                    break;
                case 422:
                    errorMessage = this.extractValidationErrors(error.error);
                    break;
                case 500:
                    errorMessage = 'Server error. Please try again later';
                    break;
                default:
                    if (error.error?.message) {
                        errorMessage = error.error.message;
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
            }
        }

        return throwError(() => new Error(errorMessage));
    }

    /**
     * Extract validation errors from a 422 response
     * 
     * @param error The error object
     * @returns string Formatted validation error message
     */
    private extractValidationErrors(error: any): string {
        if (error?.errors && typeof error.errors === 'object') {
            const errors = Object.values(error.errors).flat();
            return errors.join(', ');
        }

        if (error?.message) {
            return error.message;
        }

        return 'Validation failed. Please check your input.';
    }
}