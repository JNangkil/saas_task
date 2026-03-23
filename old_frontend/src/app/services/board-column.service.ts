import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
    BoardColumn,
    ColumnType,
    ColumnTypeDefinition,
    ColumnReorderRequest,
    ColumnStatistics
} from '../models';

/**
 * Service for managing board columns in the application
 */
@Injectable({
    providedIn: 'root'
})
export class BoardColumnService {
    private readonly baseUrl = '/api';

    constructor(
        private http: HttpClient,
        private apiService: ApiService
    ) { }

    /**
     * Get columns for a board
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @returns Observable<BoardColumn[]> Array of board columns
     */
    getBoardColumns(
        tenantId: number,
        workspaceId: number,
        boardId: number
    ): Observable<BoardColumn[]> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/columns`;

        return this.apiService.get<BoardColumn[]>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Get a single column
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param columnId The column ID
     * @returns Observable<BoardColumn> Single board column
     */
    getBoardColumn(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        columnId: number
    ): Observable<BoardColumn> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/columns/${columnId}`;

        return this.apiService.get<BoardColumn>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Create a new column
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param columnData The column data to create
     * @returns Observable<BoardColumn> Created column
     */
    createBoardColumn(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        columnData: Partial<BoardColumn>
    ): Observable<BoardColumn> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/columns`;

        return this.apiService.post<BoardColumn>(endpoint, columnData).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Update an existing column
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param columnId The column ID
     * @param columnData The column data to update
     * @returns Observable<BoardColumn> Updated column
     */
    updateBoardColumn(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        columnId: number,
        columnData: Partial<BoardColumn>
    ): Observable<BoardColumn> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/columns/${columnId}`;

        return this.apiService.put<BoardColumn>(endpoint, columnData).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Delete a column
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param columnId The column ID
     * @returns Observable<any> Delete response
     */
    deleteBoardColumn(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        columnId: number
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/columns/${columnId}`;

        return this.apiService.delete<any>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Reorder columns
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param reorderData The reorder data
     * @returns Observable<any> Reorder response
     */
    reorderBoardColumns(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        reorderData: ColumnReorderRequest
    ): Observable<any> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/columns/reorder`;

        return this.apiService.post<any>(endpoint, reorderData).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Duplicate a column
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param columnId The column ID to duplicate
     * @returns Observable<BoardColumn> Duplicated column
     */
    duplicateBoardColumn(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        columnId: number
    ): Observable<BoardColumn> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/columns/${columnId}/duplicate`;

        return this.apiService.post<BoardColumn>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Toggle pin status of a column
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param columnId The column ID
     * @returns Observable<BoardColumn> Updated column
     */
    toggleColumnPin(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        columnId: number
    ): Observable<BoardColumn> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/columns/${columnId}/toggle-pin`;

        return this.apiService.post<BoardColumn>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Toggle required status of a column
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param columnId The column ID
     * @returns Observable<BoardColumn> Updated column
     */
    toggleColumnRequired(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        columnId: number
    ): Observable<BoardColumn> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/columns/${columnId}/toggle-required`;

        return this.apiService.post<BoardColumn>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Get column statistics
     * 
     * @param tenantId The tenant ID
     * @param workspaceId The workspace ID
     * @param boardId The board ID
     * @param columnId The column ID
     * @returns Observable<ColumnStatistics> Column statistics
     */
    getColumnStatistics(
        tenantId: number,
        workspaceId: number,
        boardId: number,
        columnId: number
    ): Observable<ColumnStatistics> {
        const endpoint = `tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/columns/${columnId}/statistics`;

        return this.apiService.get<ColumnStatistics>(endpoint).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Get all available column types
     * 
     * @returns Observable<ColumnTypeDefinition[]> Array of column type definitions
     */
    getColumnTypes(): Observable<ColumnTypeDefinition[]> {
        const endpoint = 'columns/types';

        return this.apiService.get<ColumnTypeDefinition[]>(endpoint).pipe(
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
        console.error('Board Column Service Error:', error);

        let errorMessage = 'An unexpected error occurred while managing board columns';

        if (error.status) {
            switch (error.status) {
                case 400:
                    errorMessage = 'Invalid column data provided';
                    break;
                case 401:
                    errorMessage = 'You are not authorized to perform this action';
                    break;
                case 403:
                    errorMessage = 'You do not have permission to manage this column';
                    break;
                case 404:
                    errorMessage = 'The requested column was not found';
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