import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BoardService } from '../../services/board.service';
import { Board } from '../../models';

@Component({
    selector: 'app-board-filter',
    templateUrl: './board-filter.component.html',
    styleUrls: ['./board-filter.component.css'],
    standalone: true,
    imports: [CommonModule]
})
export class BoardFilterComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    @Input() selectedBoards: number[] = [];
    @Input() disabled = false;
    @Input() placeholder = 'Filter by board...';
    @Input() showAll = true;
    @Output() boardsChange = new EventEmitter<number[]>();

    boards: Board[] = [];
    loading = false;
    search = '';
    isOpen = false;

    constructor(private boardService: BoardService) { }

    ngOnInit(): void {
        this.loadBoards();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadBoards(): void {
        this.loading = true;
        // Since getBoards() requires tenantId and workspaceId, we'll use empty arrays for now
        // In a real implementation, you would get these from context or inputs
        this.boards = [];
        this.loading = false;

        // Alternative implementation would be:
        // const tenantId = 1; // Get from context or input
        // const workspaceId = 1; // Get from context or input
        // this.boardService.getBoards(tenantId, workspaceId).pipe(
        //     takeUntil(this.destroy$)
        // ).subscribe({
        //     next: (boards: Board[]) => {
        //         this.boards = boards;
        //         this.loading = false;
        //     },
        //     error: (error: any) => {
        //         console.error('Error loading boards:', error);
        //         this.loading = false;
        //     }
        // });
    }

    onBoardToggle(boardId: number): void {
        const index = this.selectedBoards.indexOf(boardId);
        if (index > -1) {
            // Remove board if already selected
            this.selectedBoards = [...this.selectedBoards.slice(0, index), ...this.selectedBoards.slice(index + 1)];
        } else {
            // Add board if not selected
            this.selectedBoards = [...this.selectedBoards, boardId];
        }
        this.boardsChange.emit(this.selectedBoards);
    }

    clearAll(): void {
        this.selectedBoards = [];
        this.boardsChange.emit(this.selectedBoards);
    }

    selectAll(): void {
        this.selectedBoards = this.boards.map(b => b.id);
        this.boardsChange.emit(this.selectedBoards);
    }

    get filteredBoards(): Board[] {
        if (!this.search) {
            return this.boards;
        }
        const lowerSearch = this.search.toLowerCase();
        return this.boards.filter(board =>
            board.name.toLowerCase().includes(lowerSearch)
        );
    }

    isBoardSelected(boardId: number): boolean {
        return this.selectedBoards.includes(boardId);
    }

    get selectedCount(): number {
        return this.selectedBoards.length;
    }

    get totalCount(): number {
        return this.boards.length;
    }

    onBlur(): void {
        // Delay closing to allow clicking on items
        setTimeout(() => {
            this.isOpen = false;
        }, 200);
    }
}