import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Board, BoardTemplate, CreateBoardRequest } from '../models/board.model';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class BoardService {
    private apiUrl = '/api'; // Relative path, proxy handles it usually

    constructor(private http: HttpClient) { }

    getBoards(tenantId: string, workspaceId: string, params?: any): Observable<Board[]> {
        return this.http.get<any>(`${this.apiUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards`, { params }).pipe(
            map(res => res.data || res)
        );
    }

    createBoard(tenantId: string, workspaceId: string, data: CreateBoardRequest): Observable<Board> {
        return this.http.post<any>(`${this.apiUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards`, data).pipe(
            map(res => res.data || res)
        );
    }

    getBoard(tenantId: string, workspaceId: string, boardId: string): Observable<Board> {
        return this.http.get<any>(`${this.apiUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}`).pipe(
            map(res => res.data || res)
        );
    }

    updateBoard(tenantId: string, workspaceId: string, boardId: string, data: Partial<Board>): Observable<Board> {
        return this.http.put<any>(`${this.apiUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}`, data).pipe(
            map(res => res.data || res)
        );
    }

    deleteBoard(tenantId: string, workspaceId: string, boardId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}`);
    }

    archiveBoard(tenantId: string, workspaceId: string, boardId: string): Observable<Board> {
        return this.http.post<any>(`${this.apiUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/archive`, {}).pipe(
            map(res => res.data || res)
        );
    }

    restoreBoard(tenantId: string, workspaceId: string, boardId: string): Observable<Board> {
        return this.http.post<any>(`${this.apiUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/restore`, {}).pipe(
            map(res => res.data || res)
        );
    }

    favoriteBoard(tenantId: string, workspaceId: string, boardId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/favorite`, {});
    }

    unfavoriteBoard(tenantId: string, workspaceId: string, boardId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/tenants/${tenantId}/workspaces/${workspaceId}/boards/${boardId}/favorite`);
    }

    // Templates
    getTemplates(params?: any): Observable<BoardTemplate[]> {
        // Global/tenant scoped. Usually tenantId is in params or query if consistent with other APIs.
        // API Route: GET /api/board-templates?tenant_id=...
        return this.http.get<any>(`${this.apiUrl}/board-templates`, { params }).pipe(
            map(res => res.data || res)
        );
    }

    createTemplate(workspaceId: string, data: any): Observable<BoardTemplate> {
        // API Route: POST /api/workspaces/{workspace}/board-templates ??
        // My routes.php: Route::post('/{workspace}/board-templates', ...)->name('workspaces.board-templates.store');
        // Inside 'workspaces' prefix group? No, I put it in 'prefix(workspaces)...'.
        // Wait, my routes.php was:
        /*
            Route::prefix('workspaces')->group(function () {
                ...
                Route::post('/{workspace}/board-templates', ...)
            });
        */
        // So URL is /api/workspaces/{workspace}/board-templates
        return this.http.post<any>(`${this.apiUrl}/workspaces/${workspaceId}/board-templates`, data).pipe(
            map(res => res.data || res)
        );
    }
}
