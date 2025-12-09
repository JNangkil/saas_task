import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BoardService } from '../../services/board.service';
import { Board } from '../../models/board.model';
import { Location } from '@angular/common';

@Component({
  selector: 'app-board-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './board-settings.html',
  styleUrl: './board-settings.css',
})
export class BoardSettings implements OnInit {
  board: Board | null = null;
  isLoading = true;
  isSaving = false;
  tenantId: string = '1';
  workspaceId: string = '';
  boardId: string = '';

  colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6366f1', '#64748b'];
  icons = ['dashboard', 'list', 'calendar_today', 'assignment', 'bug_report', 'star', 'rocket', 'lightbulb', 'work', 'people'];

  constructor(
    private boardService: BoardService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.workspaceId = params.get('workspaceId') || '';
      this.boardId = params.get('boardId') || '';
      if (this.workspaceId && this.boardId) {
        this.loadBoard();
      }
    });
  }

  loadBoard(): void {
    this.isLoading = true;
    this.boardService.getBoard(this.tenantId, this.workspaceId, this.boardId).subscribe({
      next: (data) => {
        this.board = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load board', err);
        this.isLoading = false;
      }
    });
  }

  saveChanges(): void {
    if (!this.board) return;
    this.isSaving = true;

    const updates = {
      name: this.board.name,
      description: this.board.description,
      color: this.board.color,
      icon: this.board.icon
    };

    this.boardService.updateBoard(this.tenantId, this.workspaceId, this.boardId, updates).subscribe({
      next: (updated) => {
        this.board = updated;
        this.isSaving = false;
        // Show toast?
      },
      error: (err) => {
        console.error('Failed to update board', err);
        this.isSaving = false;
      }
    });
  }

  archiveBoard(): void {
    if (!confirm('Are you sure you want to archive this board?')) return;
    this.boardService.archiveBoard(this.tenantId, this.workspaceId, this.boardId).subscribe(() => {
      this.router.navigate(['/workspaces', this.workspaceId, 'boards']);
    });
  }

  deleteBoard(): void {
    if (!confirm('Are you sure you want to PERMANENTLY delete this board? This action cannot be undone.')) return;

    // Double confirmation
    if (!confirm('Really delete? Data will be lost.')) return;

    this.boardService.deleteBoard(this.tenantId, this.workspaceId, this.boardId).subscribe(() => {
      this.router.navigate(['/workspaces', this.workspaceId, 'boards']);
    });
  }

  goBack(): void {
    this.location.back();
  }
}
