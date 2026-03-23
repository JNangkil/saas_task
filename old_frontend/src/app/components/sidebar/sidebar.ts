import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Board } from '../../models/board.model';
import { IWorkspaceContext } from '../../interfaces/workspace.interface';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { WorkspaceShellService } from '../../services/workspace-shell.service';
import { CreateBoardModal } from '../create-board-modal/create-board-modal';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, CreateBoardModal],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly context$;
  readonly boards$;
  readonly favoriteBoards$;
  readonly recentBoards$;
  readonly activeBoard$;

  isWorkspaceMenuOpen = false;
  isCreateModalOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private workspaceContextService: WorkspaceContextService,
    public workspaceShellService: WorkspaceShellService
  ) {
    this.context$ = this.workspaceContextService.context$;
    this.boards$ = this.workspaceShellService.boards$;
    this.favoriteBoards$ = this.workspaceShellService.favoriteBoards$;
    this.recentBoards$ = this.workspaceShellService.recentBoards$;
    this.activeBoard$ = this.workspaceShellService.activeBoard$;
  }

  openWorkspace(workspaceId: string): void {
    this.isWorkspaceMenuOpen = false;
    this.router.navigate(['/app', workspaceId, 'home']);
  }

  openBoard(board: Board): void {
    this.workspaceShellService.rememberBoard(board);
  }

  openBoardSettings(board: Board, event?: MouseEvent): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.router.navigate(['/app', board.workspace_id, 'boards', board.id, 'settings']);
  }

  openCreateBoard(): void {
    this.isCreateModalOpen = true;
  }

  closeCreateBoard(): void {
    this.isCreateModalOpen = false;
  }

  onBoardCreated(board: Board): void {
    this.workspaceShellService.registerBoard(board);
    this.isCreateModalOpen = false;
    this.router.navigate(['/app', board.workspace_id, 'boards', board.id]);
  }

  getUserInitials(): string {
    const user = this.authService.getCurrentUser();
    if (!user?.name) {
      return 'U';
    }

    return user.name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getUserName(): string {
    return this.authService.getCurrentUser()?.name ?? 'Workspace user';
  }

  trackBoard(index: number, board: Board): number {
    return board.id;
  }

  trackWorkspace(index: number, workspace: IWorkspaceContext['userWorkspaces'][number]): string {
    return workspace.id;
  }
}
