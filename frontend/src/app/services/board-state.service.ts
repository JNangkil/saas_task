import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { RealtimeService } from './realtime.service';
import { Task, BoardColumn, TaskComment } from '../models';
import { ApiService } from './api.service';
import { WorkspaceContextService } from './workspace-context.service';

@Injectable({
    providedIn: 'root'
})
export class BoardStateService {
    // Task Events
    public taskCreated$ = new Subject<Task>();
    public taskUpdated$ = new Subject<Task>();
    public taskDeleted$ = new Subject<{ taskId: number, boardId: number }>();
    public taskReordered$ = new Subject<{ positions: any[] }>();

    // Column Events
    public columnCreated$ = new Subject<BoardColumn>();
    public columnUpdated$ = new Subject<BoardColumn>();
    public columnDeleted$ = new Subject<{ columnId: number }>();
    public columnsReordered$ = new Subject<{ positions: any[] }>();

    // Comment Events
    public commentAdded$ = new Subject<any>();
    public commentUpdated$ = new Subject<any>();
    public commentDeleted$ = new Subject<{ commentId: number, taskId: number }>();

    // Presence
    public usersPresent$ = new BehaviorSubject<any[]>([]);
    public userJoined$ = new Subject<any>();
    public userLeft$ = new Subject<any>();

    // Polling
    public polledUpdates$ = new Subject<{ tasks: Task[], columns: BoardColumn[], comments: TaskComment[] }>();
    private pollingInterval: any;
    private lastPollTimestamp: string = new Date().toISOString();

    private currentBoardId: number | null = null;
    private currentChannelName: string | null = null;
    private currentPresenceChannelName: string | null = null;

    private currentContext: any = {};

    constructor(
        private realtimeService: RealtimeService,
        private apiService: ApiService,
        private workspaceContextService: WorkspaceContextService
    ) {
        // Monitor connection status for fallback
        this.realtimeService.connectionStatus$.subscribe(connected => {
            if (connected) {
                this.stopPolling();
            } else {
                this.startPolling();
            }
        });

        // Keep track of current context
        this.workspaceContextService.context$.subscribe(context => {
            this.currentContext = context;
        });
    }

    /**
     * Join a board channel to receive updates
     */
    public joinBoard(boardId: number): void {
        if (this.currentBoardId === boardId) {
            return;
        }

        this.leaveBoard();
        this.currentBoardId = boardId;
        this.currentChannelName = `board.${boardId}`;
        this.currentPresenceChannelName = `presence-board.${boardId}`;

        // Listen for Task Events
        this.realtimeService.listen(this.currentChannelName, 'TaskCreated', (data) => {
            if (data && data.task) {
                this.taskCreated$.next(data.task);
            }
        });

        this.realtimeService.listen(this.currentChannelName, 'TaskUpdated', (data) => {
            if (data && data.task) {
                this.taskUpdated$.next(data.task);
            }
        });

        this.realtimeService.listen(this.currentChannelName, 'TaskDeleted', (data) => {
            if (data && data.taskId) {
                this.taskDeleted$.next({ taskId: data.taskId, boardId: boardId });
            }
        });

        this.realtimeService.listen(this.currentChannelName, 'TaskReordered', (data) => {
            if (data && data.positions) {
                this.taskReordered$.next({ positions: data.positions });
            }
        });

        // Listen for Column Events
        this.realtimeService.listen(this.currentChannelName, 'ColumnCreated', (data) => {
            if (data && data.column) {
                this.columnCreated$.next(data.column);
            }
        });

        this.realtimeService.listen(this.currentChannelName, 'ColumnUpdated', (data) => {
            if (data && data.column) {
                this.columnUpdated$.next(data.column);
            }
        });

        this.realtimeService.listen(this.currentChannelName, 'ColumnDeleted', (data) => {
            if (data && data.columnId) {
                this.columnDeleted$.next({ columnId: data.columnId });
            }
        });

        this.realtimeService.listen(this.currentChannelName, 'ColumnsReordered', (data) => {
            if (data && data.positions) {
                this.columnsReordered$.next({ positions: data.positions });
            }
        });

        // Listen for Comment Events
        this.realtimeService.listen(this.currentChannelName, 'CommentAdded', (data) => {
            if (data && data.comment) {
                this.commentAdded$.next(data.comment);
            }
        });

        this.realtimeService.listen(this.currentChannelName, 'CommentUpdated', (data) => {
            if (data && data.comment) {
                this.commentUpdated$.next(data.comment);
            }
        });

        this.realtimeService.listen(this.currentChannelName, 'CommentDeleted', (data) => {
            if (data && data.commentId) {
                this.commentDeleted$.next({ commentId: data.commentId, taskId: data.taskId });
            }
        });

        // Join Presence Channel
        this.realtimeService.join(
            this.currentPresenceChannelName,
            (users) => {
                this.usersPresent$.next(users);
            },
            (user) => {
                const currentUsers = this.usersPresent$.value;
                this.usersPresent$.next([...currentUsers, user]);
                this.userJoined$.next(user);
            },
            (user) => {
                const currentUsers = this.usersPresent$.value;
                this.usersPresent$.next(currentUsers.filter(u => u.id !== user.id));
                this.userLeft$.next(user);
            }
        );
    }

    /**
     * Leave the current board channel
     */
    public leaveBoard(): void {
        if (this.currentChannelName) {
            this.realtimeService.leave(this.currentChannelName);
            this.currentChannelName = null;
        }
        if (this.currentPresenceChannelName) {
            this.realtimeService.leave(this.currentPresenceChannelName);
            this.currentPresenceChannelName = null;
        }
        this.usersPresent$.next([]);
        this.currentBoardId = null;
    }

    private startPolling(): void {
        // Don't poll if already polling or no board selected
        if (this.pollingInterval || !this.currentBoardId) {
            return;
        }

        // Check if realtime is globally disabled or if we just lost connection
        // For now, simple fallback: if disconnected, poll.
        console.log('Starting polling fallback...');

        this.pollingInterval = setInterval(() => {
            this.pollUpdates();
        }, 30000); // Poll every 30 seconds

        // Immediate first poll
        this.pollUpdates();
    }

    /**
     * Stop polling
     */
    private stopPolling(): void {
        if (this.pollingInterval) {
            console.log('Stopping polling fallback (realtime connected)');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Poll API for updates
     */
    private pollUpdates(): void {
        if (!this.currentBoardId) return;

        // We need tenant and workspace IDs. 
        // Ideally these should be stored when joining board, or retrieved from context.
        // Assuming context is available and matches current board (which it should).
        const context = this.currentContext;
        if (!context.currentTenant || !context.currentWorkspace) return;

        const endpoint = `tenants/${context.currentTenant.id}/workspaces/${context.currentWorkspace.id}/boards/${this.currentBoardId}/updates`;

        this.apiService.get<any>(endpoint, {
            params: { since: this.lastPollTimestamp }
        }).subscribe({
            next: (response) => {
                // Update timestamp for next poll
                if (response.timestamp) {
                    this.lastPollTimestamp = response.timestamp;
                }

                if (
                    (response.tasks && response.tasks.length > 0) ||
                    (response.columns && response.columns.length > 0) ||
                    (response.comments && response.comments.length > 0)
                ) {
                    this.polledUpdates$.next({
                        tasks: response.tasks || [],
                        columns: response.columns || [],
                        comments: response.comments || []
                    });
                }
            },
            error: (err) => console.error('Polling error:', err)
        });
    }
}
