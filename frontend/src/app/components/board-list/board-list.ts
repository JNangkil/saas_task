import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/board.service';
import { WorkspaceService } from '../../services/workspace.service';
import { Board } from '../../models/board.model';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CreateBoardModal } from '../create-board-modal/create-board-modal';

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, CreateBoardModal],
  templateUrl: './board-list.html',
  styleUrl: './board-list.css',
})
export class BoardList implements OnInit {
  boards: Board[] = [];
  isLoading = true;
  workspaceId: string = '';
  tenantId: string = '1'; // TODO: Get from auth/context
  view: 'grid' | 'list' = 'grid';
  searchText: string = '';
  isCreateModalOpen = false;

  constructor(
    private boardService: BoardService,
    private route: ActivatedRoute,
    private workspaceService: WorkspaceService // Ensure we have workspace context
  ) { }

  ngOnInit(): void {
    // Get workspaceId from route
    this.route.paramMap.subscribe(params => {
      this.workspaceId = params.get('workspaceId') || '';
      if (this.workspaceId) {
        this.loadBoards();
      }
    });
  }

  loadBoards(): void {
    this.isLoading = true;
    this.boardService.getBoards(this.tenantId, this.workspaceId).subscribe({
      next: (data) => {
        this.boards = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load boards', err);
        this.isLoading = false;
      }
    });
  }

  openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  onBoardCreated(): void {
    this.loadBoards();
  }

  toggleFavorite(board: Board): void {
    // Optimistic update
    const originalState = board.is_favorite;
    board.is_favorite = !board.is_favorite;

    if (board.is_favorite) {
      this.boardService.favoriteBoard(this.tenantId, this.workspaceId, board.id.toString()).subscribe({
        error: () => board.is_favorite = originalState
      });
    } else {
      this.boardService.unfavoriteBoard(this.tenantId, this.workspaceId, board.id.toString()).subscribe({
        error: () => board.is_favorite = originalState
      });
    }
  }

  // Helper to filter boards on UI side for search
  get filteredBoards(): Board[] {
    if (!this.searchText) return this.boards;
    return this.boards.filter(b => b.name.toLowerCase().includes(this.searchText.toLowerCase()));
  }

  get favoriteBoards(): Board[] {
    return this.filteredBoards.filter(b => b.is_favorite);
  }

  get otherBoards(): Board[] {
    return this.filteredBoards.filter(b => !b.is_favorite);
  }
}
