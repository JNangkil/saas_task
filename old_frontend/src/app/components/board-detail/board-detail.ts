import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { Board } from '../../models/board.model';
import { Task } from '../../models/task.model';
import { DynamicTaskTableComponent } from '../task-table/dynamic-task-table.component';
import { ViewSwitcherComponent, ViewType } from '../board-views/view-switcher/view-switcher.component';
import { KanbanViewComponent } from '../board-views/kanban-view/kanban-view.component';
import { CalendarViewComponent } from '../board-views/calendar-view/calendar-view.component';
import { TaskDetailsPanelComponent } from '../task-table/task-details-panel.component';
import { BoardStateService } from '../../services/board-state.service';
import { BoardViewPreferenceService } from '../../services/board-view-preference.service';
import { TaskService } from '../../services/task.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { WorkspaceShellService } from '../../services/workspace-shell.service';

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DynamicTaskTableComponent,
    ViewSwitcherComponent,
    KanbanViewComponent,
    CalendarViewComponent,
    TaskDetailsPanelComponent
  ],
  templateUrl: './board-detail.html',
  styleUrl: './board-detail.css',
})
export class BoardDetail implements OnInit, OnDestroy {
  board: Board | null = null;
  boardId: number | null = null;
  currentView: ViewType = 'table';
  selectedTask: Task | null = null;
  quickTaskTitle = '';
  creatingTask = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private boardStateService: BoardStateService,
    private boardViewPreferenceService: BoardViewPreferenceService,
    private taskService: TaskService,
    private workspaceContextService: WorkspaceContextService,
    private workspaceShellService: WorkspaceShellService
  ) { }

  ngOnInit(): void {
    combineLatest([
      this.activatedRoute.paramMap,
      this.activatedRoute.queryParamMap,
      this.workspaceContextService.context$,
      this.workspaceShellService.boards$
    ]).pipe(
      takeUntil(this.destroy$),
      filter(([params, , context]) => !!params.get('boardId') && !!context.currentWorkspace && !!context.currentTenant)
    ).subscribe(([params, query, context, boards]) => {
      const nextBoardId = Number(params.get('boardId'));
      const boardChanged = this.boardId !== nextBoardId;

      this.boardId = nextBoardId;
      this.board = boards.find((board) => board.id === nextBoardId) ?? null;

      if (this.board && boardChanged) {
        this.boardStateService.selectTask(null);
        this.workspaceShellService.rememberBoard(this.board);
        this.loadViewPreferences(context.currentTenant!.id, context.currentWorkspace!.id, this.board.id.toString());
      }

      const queryView = query.get('view');
      if (queryView === 'table' || queryView === 'kanban' || queryView === 'calendar') {
        this.currentView = queryView;
      }
    });

    this.boardStateService.selectedTask$
      .pipe(takeUntil(this.destroy$))
      .subscribe((task) => {
        this.selectedTask = task;
      });

    this.boardStateService.taskUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe((task) => {
        if (this.selectedTask?.id === task.id) {
          this.selectedTask = task;
        }
      });

    this.boardStateService.taskDeleted$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ taskId }) => {
        if (this.selectedTask?.id === taskId) {
          this.boardStateService.selectTask(null);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onViewChange(view: ViewType): void {
    this.currentView = view;

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { view },
      queryParamsHandling: 'merge'
    });

    this.workspaceContextService.context$.pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe((context) => {
      if (!context.currentTenant || !context.currentWorkspace || !this.boardId) {
        return;
      }

      this.boardViewPreferenceService.updatePreferences(
        context.currentTenant.id,
        context.currentWorkspace.id,
        this.boardId.toString(),
        { preferred_view: view }
      ).subscribe();
    });
  }

  createTask(): void {
    const title = this.quickTaskTitle.trim();

    if (!title || this.creatingTask || !this.boardId) {
      return;
    }

    this.creatingTask = true;

    this.workspaceContextService.context$.pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe((context) => {
      if (!context.currentTenant || !context.currentWorkspace) {
        this.creatingTask = false;
        return;
      }

      this.taskService.createTask(
        Number(context.currentTenant.id),
        Number(context.currentWorkspace.id),
        {
          title,
          board_id: this.boardId ?? undefined,
          status: 'todo',
          priority: 'medium'
        }
      ).subscribe({
        next: (task) => {
          this.quickTaskTitle = '';
          this.creatingTask = false;
          this.boardStateService.taskCreated$.next(task);
          this.boardStateService.selectTask(task);
        },
        error: (error) => {
          console.error('Failed to create task from board surface', error);
          this.creatingTask = false;
        }
      });
    });
  }

  onTaskUpdated(updatedTask: Task): void {
    this.selectedTask = updatedTask;
    this.boardStateService.taskUpdated$.next(updatedTask);
  }

  onCloseDetails(): void {
    this.boardStateService.selectTask(null);
  }

  openSettings(): void {
    if (!this.board) {
      return;
    }

    this.router.navigate(['/app', this.board.workspace_id, 'boards', this.board.id, 'settings']);
  }

  private loadViewPreferences(tenantId: string, workspaceId: string, boardId: string): void {
    this.boardViewPreferenceService.getPreferences(tenantId, workspaceId, boardId)
      .pipe(take(1))
      .subscribe((preference) => {
        const routeView = this.activatedRoute.snapshot.queryParamMap.get('view');

        if (preference?.preferred_view && !routeView) {
          this.currentView = preference.preferred_view;
        } else if (!preference?.preferred_view && !routeView) {
          this.currentView = 'table';
        }
      });
  }
}
