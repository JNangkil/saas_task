import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { RealtimeService } from './realtime.service';
import { Task, BoardColumn } from '../models';

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

    // Presence
    public usersPresent$ = new BehaviorSubject<any[]>([]);
    public userJoined$ = new Subject<any>();
    public userLeft$ = new Subject<any>();

    private currentBoardId: number | null = null;
    private currentChannelName: string | null = null;
    private currentPresenceChannelName: string | null = null;

    constructor(private realtimeService: RealtimeService) { }

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
}
