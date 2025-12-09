import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DynamicTaskTableComponent } from '../task-table/dynamic-task-table.component';
import { ViewSwitcherComponent, ViewType } from '../board-views/view-switcher/view-switcher.component';
import { KanbanViewComponent } from '../board-views/kanban-view/kanban-view.component';
import { CalendarViewComponent } from '../board-views/calendar-view/calendar-view.component';
import { BoardViewPreferenceService } from '../../services/board-view-preference.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Task } from '../../models/task.model';
import { BoardStateService } from '../../services/board-state.service';
import { TaskDetailsPanelComponent } from '../task-table/task-details-panel.component';

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [
    CommonModule,
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
  boardId: number | undefined;
  currentView: ViewType = 'table';
  selectedTask: Task | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private viewPreferenceService: BoardViewPreferenceService,
    private workspaceContextService: WorkspaceContextService,
    private boardStateService: BoardStateService
  ) { }

  ngOnInit(): void {
    combineLatest([
      this.route.paramMap,
      this.route.queryParams,
      this.workspaceContextService.context$
    ]).pipe(
      takeUntil(this.destroy$),
      filter(([params, query, context]) => !!context.currentTenant && !!context.currentWorkspace)
    ).subscribe(([params, query, context]: [any, any, any]) => {
      const id = params.get('boardId');
      if (id) {
        const bid = parseInt(id, 10);

        // If board changed, load preferences
        if (this.boardId !== bid) {
          this.boardId = bid;
          this.loadViewPreferences(context.currentTenant!.id, context.currentWorkspace!.id, id);
        }
      }

      // Check query params for view override
      if (query['view'] && ['table', 'kanban', 'calendar'].includes(query['view'])) {
        this.currentView = query['view'] as ViewType;
      }
    });

    // Subscribe to selected task
    this.boardStateService.selectedTask$
      .pipe(takeUntil(this.destroy$))
      .subscribe(task => {
        this.selectedTask = task;
      });
  }

  onCloseDetails() {
    this.boardStateService.selectTask(null);
  }

  loadViewPreferences(tenantId: string, workspaceId: string, boardId: string) {
    this.viewPreferenceService.getPreferences(tenantId, workspaceId, boardId)
      .subscribe(pref => {
        if (pref && pref.preferred_view && !this.route.snapshot.queryParams['view']) {
          this.currentView = pref.preferred_view;
        }
      });
  }

  onViewChange(view: ViewType) {
    this.currentView = view;

    // Update URL without reload
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view },
      queryParamsHandling: 'merge'
    });

    // Save preference
    this.workspaceContextService.context$.pipe(takeUntil(this.destroy$)).subscribe(context => {
      if (context.currentTenant && context.currentWorkspace && this.boardId) {
        this.viewPreferenceService.updatePreferences(
          context.currentTenant.id,
          context.currentWorkspace.id,
          this.boardId.toString(),
          { preferred_view: view }
        ).subscribe();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
