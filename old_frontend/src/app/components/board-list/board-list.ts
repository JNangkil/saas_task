import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Board } from '../../models/board.model';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { WorkspaceShellService } from '../../services/workspace-shell.service';
import { CreateBoardModal } from '../create-board-modal/create-board-modal';

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CreateBoardModal],
  templateUrl: './board-list.html',
  styleUrl: './board-list.css',
})
export class BoardList {
  readonly context$;
  readonly boards$;
  readonly recentBoards$;
  readonly favoriteBoards$;

  searchText = '';
  isCreateModalOpen = false;
  archiveInFlightId: number | null = null;

  constructor(
    private router: Router,
    private workspaceContextService: WorkspaceContextService,
    public workspaceShellService: WorkspaceShellService
  ) {
    this.context$ = this.workspaceContextService.context$;
    this.boards$ = this.workspaceShellService.boards$;
    this.recentBoards$ = this.workspaceShellService.recentBoards$;
    this.favoriteBoards$ = this.workspaceShellService.favoriteBoards$;
  }

  get filteredBoards(): Board[] {
    const search = this.searchText.trim().toLowerCase();
    if (!search) {
      return this.workspaceShellService.boards$.value;
    }

    return this.workspaceShellService.boards$.value.filter((board) => {
      return [board.name, board.description ?? ''].some((value) => value.toLowerCase().includes(search));
    });
  }

  get favoriteBoards(): Board[] {
    const filteredIds = new Set(this.filteredBoards.map((board) => board.id));
    return this.workspaceShellService.favoriteBoards$.value.filter((board) => filteredIds.has(board.id));
  }

  get recentBoards(): Board[] {
    const filteredIds = new Set(this.filteredBoards.map((board) => board.id));
    return this.workspaceShellService.recentBoards$.value.filter((board) => filteredIds.has(board.id));
  }

  get allBoards(): Board[] {
    return this.filteredBoards;
  }

  openBoard(board: Board): void {
    this.workspaceShellService.rememberBoard(board);
    this.router.navigate(['/app', board.workspace_id, 'boards', board.id]);
  }

  openBoardSettings(board: Board, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.router.navigate(['/app', board.workspace_id, 'boards', board.id, 'settings']);
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  onBoardCreated(board: Board): void {
    this.workspaceShellService.registerBoard(board);
    this.isCreateModalOpen = false;
    this.router.navigate(['/app', board.workspace_id, 'boards', board.id]);
  }

  toggleFavorite(board: Board, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.workspaceShellService.toggleFavorite(board).subscribe({
      error: (error) => console.error('Failed to toggle favorite board', error)
    });
  }

  archiveBoard(board: Board, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.archiveInFlightId || !confirm(`Archive "${board.name}"?`)) {
      return;
    }

    this.archiveInFlightId = board.id;
    this.workspaceShellService.archiveBoard(board).subscribe({
      next: () => {
        this.archiveInFlightId = null;
      },
      error: (error) => {
        console.error('Failed to archive board', error);
        this.archiveInFlightId = null;
      }
    });
  }

  trackBoard(index: number, board: Board): number {
    return board.id;
  }
}
