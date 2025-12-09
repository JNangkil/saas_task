import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
    TaskFieldValue,
    BulkFieldValueUpdate,
    BulkFieldValueDelete,
    ColumnStatistics
} from '../models';

/**
 * Service for managing task field values in the application
 */
@Injectable({
    providedIn: 'root'
})
export class TaskFieldValueService {
    private readonly baseUrl = '/api';

    constructor(
        private http: HttpClient,
        private apiService: ApiService
    ) { }

    /**
     * Get field values for a task
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @returns Observable<TaskFieldValue[]> Array of task field values
     */
    getTaskFieldValues(
        tenantId: number,
        workspaceId: number,
        taskId: number
    ): Observable<TaskFieldValue[]> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/field-values`;

        return this.apiService.get<TaskFieldValue[]>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Get a single field value
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @param fieldValueId The field value ID
     * @returns Observable<TaskFieldValue> Single task field value
     */
    getTaskFieldValue(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        fieldValueId: number
    ): Observable<TaskFieldValue> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/field-values/${fieldValueId}`;

        return this.apiService.get<TaskFieldValue>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Create or update field values for a task
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @param fieldValues The field values to create/update
     * @returns Observable<TaskFieldValue[]> Created/updated field values
     */
    createOrUpdateTaskFieldValues(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        fieldValues: { board_column_id: number; value: any }[]
    ): Observable<TaskFieldValue[]> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/field-values`;

        return this.apiService.post<TaskFieldValue[]>(endpoint, { field_values: fieldValues }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Update a single field value
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @param fieldValueId The field value ID
     * @param value The new value
     * @returns Observable<TaskFieldValue> Updated field value
     */
    updateTaskFieldValue(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        fieldValueId: number,
        value: any
    ): Observable<TaskFieldValue> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/field-values/${fieldValueId}`;

        return this.apiService.put<TaskFieldValue>(endpoint, { value }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Delete a field value
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @param fieldValueId The field value ID
     * @returns Observable<any> Delete response
     */
    deleteTaskFieldValue(
        tenantId: number,
        workspaceId: number,
        taskId: number,
        fieldValueId: number
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/field-values/${fieldValueId}`;

        return this.apiService.delete<any>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Clear all field values for a task (except required columns)
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param taskId The task ID
     * @returns Observable<any> Clear response
     */
    clearAllTaskFieldValues(
        tenantId: number,
        workspaceId: number,
        taskId: number
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/${taskId}/field-values/clear`;

        return this.apiService.delete<any>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Bulk update field values for multiple tasks
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param bulkUpdate The bulk update data
     * @returns Observable<TaskFieldValue[]> Updated field values
     */
    bulkUpdateTaskFieldValues(
        tenantId: number,
        workspaceId: number,
        bulkUpdate: BulkFieldValueUpdate
    ): Observable<TaskFieldValue[]> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/bulk-field-values`;

        return this.apiService.post<TaskFieldValue[]>(endpoint, bulkUpdate).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Bulk delete field values for multiple tasks
     *
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param bulkDelete The bulk delete data
     * @returns Observable<any> Delete response
     */
    bulkDeleteTaskFieldValues(
        tenantId: number,
        workspaceId: number,
        bulkDelete: BulkFieldValueDelete
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/bulk-field-values/delete`;

        return this.apiService.post<any>(endpoint, bulkDelete).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Get column values for filtering
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param columnId The column ID
     * @returns Observable<any> Column values
     */
    getColumnValues(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        columnId?: number
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/column-values`;
        const params = columnId ? { column_id: columnId } : {};

        return this.apiService.get<any>(endpoint, { params }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Get field value statistics
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param columnId The column ID
     * @returns Observable<ColumnStatistics> Field value statistics
     */
    getFieldValueStatistics(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        columnId?: number
    ): Observable<ColumnStatistics> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/tasks/field-values/statistics`;
        const params = columnId ? { column_id: columnId } : {};

        return this.apiService.get<ColumnStatistics>(endpoint, { params }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Handle HTTP errors and provide user-friendly messages
     * 
     * @param error The HTTP error
     * @returns Observable<never> Error observable
     */
    private handleError(error: any): Observable<never> {
        console.error('Task Field Value Service Error:', error);

        let errorMessage = 'An unexpected error occurred while managing task field values';

        if (error.status) {
            switch (error.status) {
                case 400:
                    errorMessage = 'Invalid field value data provided';
                    break;
                case 401:
                    errorMessage = 'You are not authorized to perform this action';
                    break;
                case 403:
                    errorMessage = 'You do not have permission to manage this field value';
                    break;
                case 404:
                    errorMessage = 'The requested field value was not found';
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