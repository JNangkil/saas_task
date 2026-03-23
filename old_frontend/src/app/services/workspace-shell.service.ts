import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Board } from '../models/board.model';
import { IWorkspace, ITenant } from '../interfaces/workspace.interface';
import { BoardService } from './board.service';
import { WorkspaceContextService } from './workspace-context.service';
import { WorkspaceService } from './workspace.service';

export type ShellSurface = 'auto' | 'workspace' | 'home' | 'board' | 'settings';

export interface ShellRouteRequest {
    workspaceId: string | null;
    boardId: string | null;
    surface: ShellSurface;
}

export interface ShellRouteResult {
    redirectUrl: string | null;
    workspace: IWorkspace | null;
    board: Board | null;
}

@Injectable({
    providedIn: 'root'
})
export class WorkspaceShellService {
    private readonly recentBoardsStorageKey = 'shellRecentBoardsByWorkspace';
    private readonly lastBoardStorageKey = 'shellLastBoardByWorkspace';

    readonly boards$ = new BehaviorSubject<Board[]>([]);
    readonly favoriteBoards$ = new BehaviorSubject<Board[]>([]);
    readonly recentBoards$ = new BehaviorSubject<Board[]>([]);
    readonly activeBoard$ = new BehaviorSubject<Board | null>(null);
    readonly loading$ = new BehaviorSubject<boolean>(false);
    readonly ready$ = new BehaviorSubject<boolean>(false);
    readonly error$ = new BehaviorSubject<string | null>(null);

    constructor(
        private boardService: BoardService,
        private workspaceContextService: WorkspaceContextService,
        private workspaceService: WorkspaceService
    ) { }

    syncRoute(request: ShellRouteRequest): Observable<ShellRouteResult> {
        this.loading$.next(true);
        this.ready$.next(false);
        this.error$.next(null);

        return this.workspaceService.getCurrentTenantWorkspaces().pipe(
            catchError(error => {
                console.error('Failed to load shell workspaces', error);
                this.workspaceContextService.setUserWorkspaces([]);
                this.workspaceContextService.setCurrentWorkspace(null);
                this.workspaceContextService.setCurrentTenant(null);
                this.updateBoardCollections([]);
                this.loading$.next(false);
                this.ready$.next(true);
                this.error$.next('Unable to load your workspaces.');
                return of([] as IWorkspace[]);
            }),
            switchMap((workspaces) => {
                this.workspaceContextService.setUserWorkspaces(workspaces);

                const workspace = this.resolveWorkspace(workspaces, request.workspaceId);
                if (!workspace) {
                    this.workspaceContextService.setCurrentWorkspace(null);
                    this.workspaceContextService.setCurrentTenant(null);
                    this.updateBoardCollections([]);
                    this.loading$.next(false);
                    this.ready$.next(true);
                    return of({
                        redirectUrl: null,
                        workspace: null,
                        board: null
                    });
                }

                this.workspaceContextService.setCurrentWorkspace(workspace);
                this.workspaceContextService.setCurrentTenant(this.createTenantFromWorkspace(workspace));

                return this.boardService.getBoards(workspace.tenant_id, workspace.id).pipe(
                    map((boards) => boards.filter((board) => !board.is_archived)),
                    catchError(error => {
                        console.error('Failed to load shell boards', error);
                        this.error$.next('Unable to load boards for this workspace.');
                        return of([] as Board[]);
                    }),
                    map((boards) => this.buildRouteResult(workspace, boards, request))
                );
            }),
            tap((result) => {
                this.loading$.next(false);
                this.ready$.next(true);
                this.activeBoard$.next(result.board);
            })
        );
    }

    rememberBoard(board: Board): void {
        this.activeBoard$.next(board);
        this.persistRecentBoard(board.workspace_id.toString(), board.id);
        this.persistLastBoard(board.workspace_id.toString(), board.id);
        this.updateBoardCollections(this.boards$.value);
    }

    registerBoard(board: Board): void {
        const nextBoards = this.mergeBoard(board, this.boards$.value);
        this.updateBoardCollections(nextBoards);
        this.rememberBoard(board);
    }

    updateBoard(board: Board): void {
        const nextBoards = this.mergeBoard(board, this.boards$.value);
        this.updateBoardCollections(nextBoards);

        if (this.activeBoard$.value?.id === board.id) {
            this.activeBoard$.next(board);
        }
    }

    removeBoard(boardId: number): void {
        const currentBoards = this.boards$.value.filter((board) => board.id !== boardId);
        this.updateBoardCollections(currentBoards);

        if (this.activeBoard$.value?.id === boardId) {
            this.activeBoard$.next(null);
        }

        const workspaceId = this.workspaceContextService.context.currentWorkspace?.id;
        if (workspaceId) {
            this.removeStoredBoard(workspaceId, boardId);
        }
    }

    toggleFavorite(board: Board): Observable<void> {
        const nextFavoriteState = !board.is_favorite;
        this.updateBoard({ ...board, is_favorite: nextFavoriteState });

        const request$ = nextFavoriteState
            ? this.boardService.favoriteBoard(board.tenant_id.toString(), board.workspace_id.toString(), board.id.toString())
            : this.boardService.unfavoriteBoard(board.tenant_id.toString(), board.workspace_id.toString(), board.id.toString());

        return request$.pipe(
            map(() => void 0),
            catchError(error => {
                this.updateBoard({ ...board, is_favorite: !!board.is_favorite });
                return throwError(() => error);
            })
        );
    }

    archiveBoard(board: Board): Observable<void> {
        return this.boardService.archiveBoard(
            board.tenant_id.toString(),
            board.workspace_id.toString(),
            board.id.toString()
        ).pipe(
            tap(() => this.removeBoard(board.id)),
            map(() => void 0)
        );
    }

    get currentWorkspace(): IWorkspace | null {
        return this.workspaceContextService.context.currentWorkspace;
    }

    get currentTenantId(): string | null {
        return this.workspaceContextService.context.currentTenant?.id
            ?? this.workspaceContextService.context.currentWorkspace?.tenant_id
            ?? null;
    }

    private buildRouteResult(
        workspace: IWorkspace,
        boards: Board[],
        request: ShellRouteRequest
    ): ShellRouteResult {
        this.updateBoardCollections(boards, workspace.id);

        const requestedBoard = request.boardId
            ? boards.find((board) => board.id === Number(request.boardId)) ?? null
            : null;

        if (request.boardId && !requestedBoard) {
            return {
                redirectUrl: this.homeUrl(workspace.id),
                workspace,
                board: null
            };
        }

        if (requestedBoard) {
            this.rememberBoard(requestedBoard);

            if (request.surface === 'settings') {
                return {
                    redirectUrl: this.settingsUrl(workspace.id, requestedBoard.id),
                    workspace,
                    board: requestedBoard
                };
            }

            return {
                redirectUrl: this.boardUrl(workspace.id, requestedBoard.id),
                workspace,
                board: requestedBoard
            };
        }

        const storedBoard = request.surface === 'auto'
            ? this.resolveStoredBoard(boards, workspace.id)
            : null;

        if (storedBoard) {
            this.rememberBoard(storedBoard);

            return {
                redirectUrl: this.boardUrl(workspace.id, storedBoard.id),
                workspace,
                board: storedBoard
            };
        }

        this.activeBoard$.next(null);

        if (request.surface === 'home') {
            return {
                redirectUrl: this.homeUrl(workspace.id),
                workspace,
                board: null
            };
        }

        return {
            redirectUrl: this.homeUrl(workspace.id),
            workspace,
            board: null
        };
    }

    private resolveWorkspace(workspaces: IWorkspace[], routeWorkspaceId: string | null): IWorkspace | null {
        if (!workspaces.length) {
            return null;
        }

        if (routeWorkspaceId) {
            const routeWorkspace = workspaces.find((workspace) => workspace.id === routeWorkspaceId);
            if (routeWorkspace) {
                return routeWorkspace;
            }
        }

        const lastWorkspaceId = this.workspaceContextService.context.currentWorkspace?.id
            ?? localStorage.getItem('lastWorkspaceId');

        if (lastWorkspaceId) {
            const rememberedWorkspace = workspaces.find((workspace) => workspace.id === lastWorkspaceId);
            if (rememberedWorkspace) {
                return rememberedWorkspace;
            }
        }

        return workspaces.find((workspace) => workspace.is_default) ?? workspaces[0];
    }

    private resolveStoredBoard(boards: Board[], workspaceId: string): Board | null {
        const lastBoardId = this.getStoredLastBoardId(workspaceId);
        if (lastBoardId) {
            const lastBoard = boards.find((board) => board.id === lastBoardId);
            if (lastBoard) {
                return lastBoard;
            }
        }

        const recentBoards = this.getStoredRecentBoardIds(workspaceId);
        for (const boardId of recentBoards) {
            const board = boards.find((candidate) => candidate.id === boardId);
            if (board) {
                return board;
            }
        }

        return null;
    }

    private updateBoardCollections(boards: Board[], workspaceId = this.currentWorkspace?.id ?? null): void {
        const sortedBoards = [...boards].sort((left, right) => left.position - right.position);
        this.boards$.next(sortedBoards);
        this.favoriteBoards$.next(sortedBoards.filter((board) => board.is_favorite));

        if (!workspaceId) {
            this.recentBoards$.next([]);
            return;
        }

        const recentBoardIds = this.getStoredRecentBoardIds(workspaceId);
        const recentBoards = recentBoardIds
            .map((boardId) => sortedBoards.find((board) => board.id === boardId) ?? null)
            .filter((board): board is Board => !!board);

        this.recentBoards$.next(recentBoards);
    }

    private persistRecentBoard(workspaceId: string, boardId: number): void {
        const current = this.readStorageRecord(this.recentBoardsStorageKey);
        const next = [boardId, ...(current[workspaceId] ?? []).filter((candidate) => candidate !== boardId)].slice(0, 8);
        current[workspaceId] = next;
        this.writeStorageRecord(this.recentBoardsStorageKey, current);
    }

    private persistLastBoard(workspaceId: string, boardId: number): void {
        const current = this.readStorageRecord(this.lastBoardStorageKey);
        current[workspaceId] = [boardId];
        this.writeStorageRecord(this.lastBoardStorageKey, current);
    }

    private getStoredRecentBoardIds(workspaceId: string): number[] {
        return this.readStorageRecord(this.recentBoardsStorageKey)[workspaceId] ?? [];
    }

    private getStoredLastBoardId(workspaceId: string): number | null {
        return this.readStorageRecord(this.lastBoardStorageKey)[workspaceId]?.[0] ?? null;
    }

    private removeStoredBoard(workspaceId: string, boardId: number): void {
        const recent = this.readStorageRecord(this.recentBoardsStorageKey);
        recent[workspaceId] = (recent[workspaceId] ?? []).filter((candidate) => candidate !== boardId);
        this.writeStorageRecord(this.recentBoardsStorageKey, recent);

        const last = this.readStorageRecord(this.lastBoardStorageKey);
        last[workspaceId] = (last[workspaceId] ?? []).filter((candidate) => candidate !== boardId);
        this.writeStorageRecord(this.lastBoardStorageKey, last);
    }

    private readStorageRecord(storageKey: string): Record<string, number[]> {
        try {
            return JSON.parse(localStorage.getItem(storageKey) ?? '{}');
        } catch {
            return {};
        }
    }

    private writeStorageRecord(storageKey: string, value: Record<string, number[]>): void {
        localStorage.setItem(storageKey, JSON.stringify(value));
    }

    private mergeBoard(board: Board, boards: Board[]): Board[] {
        const existingIndex = boards.findIndex((candidate) => candidate.id === board.id);
        if (existingIndex === -1) {
            return [...boards, board];
        }

        const nextBoards = [...boards];
        nextBoards.splice(existingIndex, 1, board);
        return nextBoards;
    }

    private createTenantFromWorkspace(workspace: IWorkspace): ITenant {
        return {
            id: workspace.tenant_id,
            name: 'Current Tenant',
            slug: `tenant-${workspace.tenant_id}`,
            status: 'active',
            created_at: workspace.created_at,
            updated_at: workspace.updated_at
        };
    }

    private homeUrl(workspaceId: string): string {
        return `/app/${workspaceId}/home`;
    }

    private boardUrl(workspaceId: string, boardId: number): string {
        return `/app/${workspaceId}/boards/${boardId}`;
    }

    private settingsUrl(workspaceId: string, boardId: number): string {
        return `/app/${workspaceId}/boards/${boardId}/settings`;
    }
}
