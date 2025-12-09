import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { BoardService } from '../../services/board.service';
import { Board } from '../../models/board.model';
import { WorkspaceService } from '../../services/workspace.service';
import { NotificationBell } from '../notification-bell/notification-bell';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationBell],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  boards: Board[] = [];
  tenantId = '1';
  workspaceId = '';
  workspaceName = 'Workspace';

  constructor(
    private boardService: BoardService,
    private route: ActivatedRoute,
    private workspaceService: WorkspaceService
  ) { }

  ngOnInit(): void {
    // Current route might be child of layout, so we check parent route params or query params
    // But route params are usually inherited if paramsInheritanceStrategy is set, or we explicitly check root/children.
    // ActivatedRoute here might be the Sidebar's route context.

    // We'll traverse up to find workspaceId or subscribe to events
    // For now, let's try to get from URL
    // Actually, since Sidebar is used in WorkspaceLayout which is a wrapper for routes like 'workspaces/:workspaceId/boards'
    // The ActiveRoute in Sidebar might not have params directly if it's not the primary outlet component?
    // Wait, Sidebar is a child component of WorkspaceLayout.
    // WorkspaceLayout is the component for the route 'workspaces/:workspaceId'.
    // So ActivatedRoute in Sidebar will likely be empty or need parent access.

    // Better: Helper to parse URL or subscribe to router events.
    this.workspaceId = this.route.snapshot.paramMap.get('workspaceId') ||
      this.route.parent?.snapshot.paramMap.get('workspaceId') ||
      this.route.firstChild?.snapshot.paramMap.get('workspaceId') || '';

    // If still empty (because we might be deep formatted), rely on parsing URL manually as fallback
    if (!this.workspaceId) {
      const path = window.location.pathname;
      const match = path.match(/workspaces\/(\d+)/);
      if (match) this.workspaceId = match[1];
    }

    if (this.workspaceId) {
      this.loadBoards();
      this.loadWorkspaceInfo();
    }
  }

  loadBoards(): void {
    this.boardService.getBoards(this.tenantId, this.workspaceId).subscribe(data => {
      this.boards = data;
    });
  }

  loadWorkspaceInfo(): void {
    // Fetch workspace name
    // this.workspaceService.getWorkspace(this.workspaceId)...
  }

  get favoriteBoards(): Board[] {
    return this.boards.filter(b => b.is_favorite);
  }
}
