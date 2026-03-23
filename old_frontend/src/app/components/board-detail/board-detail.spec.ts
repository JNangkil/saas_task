import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { BoardDetail } from './board-detail';
import { DynamicTaskTableComponent } from '../task-table/dynamic-task-table.component';
import { ViewSwitcherComponent } from '../board-views/view-switcher/view-switcher.component';
import { KanbanViewComponent } from '../board-views/kanban-view/kanban-view.component';
import { CalendarViewComponent } from '../board-views/calendar-view/calendar-view.component';
import { TaskDetailsPanelComponent } from '../task-table/task-details-panel.component';
import { BoardViewPreferenceService } from '../../services/board-view-preference.service';
import { BoardStateService } from '../../services/board-state.service';
import { TaskService } from '../../services/task.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { WorkspaceShellService } from '../../services/workspace-shell.service';

@Component({
  selector: 'app-dynamic-task-table',
  standalone: true,
  template: ''
})
class DynamicTaskTableStub {
  @Input() boardId?: number;
}

@Component({
  selector: 'app-view-switcher',
  standalone: true,
  template: ''
})
class ViewSwitcherStub {
  @Input() currentView: 'table' | 'kanban' | 'calendar' = 'table';
  @Output() viewChange = new EventEmitter<'table' | 'kanban' | 'calendar'>();
}

@Component({
  selector: 'app-kanban-view',
  standalone: true,
  template: ''
})
class KanbanViewStub {
  @Input() boardId?: number;
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  template: ''
})
class CalendarViewStub {
  @Input() boardId?: number;
}

@Component({
  selector: 'app-task-details-panel',
  standalone: true,
  template: ''
})
class TaskDetailsPanelStub {
  @Input() task: any;
  @Input() visible = true;
  @Input() docked = false;
  @Output() close = new EventEmitter<void>();
  @Output() taskUpdate = new EventEmitter<any>();
}

describe('BoardDetail', () => {
  let fixture: ComponentFixture<BoardDetail>;
  let component: BoardDetail;
  let queryParamMap$: BehaviorSubject<any>;
  let paramMap$: BehaviorSubject<any>;
  let boardState: {
    selectedTask$: BehaviorSubject<any>;
    taskUpdated$: Subject<any>;
    taskDeleted$: Subject<any>;
    taskCreated$: Subject<any>;
    selectTask: jasmine.Spy;
  };
  let taskService: jasmine.SpyObj<TaskService>;
  let router: jasmine.SpyObj<Router>;
  let shellService: { boards$: BehaviorSubject<any[]>; rememberBoard: jasmine.Spy };
  let boardViewPreferenceService: jasmine.SpyObj<BoardViewPreferenceService>;

  beforeEach(async () => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ workspaceId: '1', boardId: '77' }));
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

    boardState = {
      selectedTask$: new BehaviorSubject<any>(null),
      taskUpdated$: new Subject<any>(),
      taskDeleted$: new Subject<any>(),
      taskCreated$: new Subject<any>(),
      selectTask: jasmine.createSpy('selectTask').and.callFake((task) => boardState.selectedTask$.next(task))
    };

    taskService = jasmine.createSpyObj<TaskService>('TaskService', ['createTask']);
    boardViewPreferenceService = jasmine.createSpyObj<BoardViewPreferenceService>('BoardViewPreferenceService', ['getPreferences', 'updatePreferences']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    shellService = {
      boards$: new BehaviorSubject([
        {
          id: 77,
          tenant_id: 9,
          workspace_id: 1,
          name: 'Board Surface',
          type: 'kanban',
          position: 1,
          is_archived: false,
          created_at: '2026-03-19T00:00:00Z',
          updated_at: '2026-03-19T00:00:00Z'
        }
      ]),
      rememberBoard: jasmine.createSpy('rememberBoard')
    };

    boardViewPreferenceService.getPreferences.and.returnValue(of({ preferred_view: 'table' } as any));
    boardViewPreferenceService.updatePreferences.and.returnValue(of({ preferred_view: 'kanban' } as any));
    taskService.createTask.and.returnValue(of({
      id: 300,
      tenant_id: 9,
      workspace_id: 1,
      board_id: 77,
      title: 'Quick task',
      status: 'todo',
      priority: 'medium',
      creator_id: 1,
      position: 1,
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T00:00:00Z'
    } as any));

    await TestBed.configureTestingModule({
      imports: [BoardDetail],
      providers: [
        WorkspaceContextService,
        { provide: TaskService, useValue: taskService },
        { provide: BoardViewPreferenceService, useValue: boardViewPreferenceService },
        { provide: BoardStateService, useValue: boardState },
        { provide: WorkspaceShellService, useValue: shellService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
            queryParamMap: queryParamMap$.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}) }
          }
        }
      ]
    })
      .overrideComponent(BoardDetail, {
        remove: {
          imports: [
            DynamicTaskTableComponent,
            ViewSwitcherComponent,
            KanbanViewComponent,
            CalendarViewComponent,
            TaskDetailsPanelComponent
          ]
        },
        add: {
          imports: [DynamicTaskTableStub, ViewSwitcherStub, KanbanViewStub, CalendarViewStub, TaskDetailsPanelStub]
        }
      })
      .compileComponents();

    const contextService = TestBed.inject(WorkspaceContextService);
    contextService.setCurrentWorkspace({
      id: '1',
      tenant_id: '9',
      name: 'Workspace',
      is_archived: false,
      is_default: true,
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T00:00:00Z'
    });
    contextService.setCurrentTenant({
      id: '9',
      name: 'Tenant',
      slug: 'tenant',
      status: 'active',
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T00:00:00Z'
    });

    fixture = TestBed.createComponent(BoardDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('opens the docked task record panel when a task is selected from shared board state', () => {
    boardState.selectedTask$.next({
      id: 1,
      tenant_id: 9,
      workspace_id: 1,
      board_id: 77,
      title: 'Selected task',
      status: 'todo',
      priority: 'medium',
      creator_id: 1,
      position: 1,
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T00:00:00Z'
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-task-details-panel')).not.toBeNull();
  });

  it('persists the selected board view inside the work surface', () => {
    component.onViewChange('kanban');

    expect(router.navigate).toHaveBeenCalled();
    expect(boardViewPreferenceService.updatePreferences).toHaveBeenCalled();
  });

  it('creates tasks inline from the board surface and opens the new record panel', () => {
    component.quickTaskTitle = 'Quick task';
    component.createTask();

    expect(taskService.createTask).toHaveBeenCalled();
    expect(boardState.selectTask).toHaveBeenCalledWith(jasmine.objectContaining({ id: 300, title: 'Quick task' }));
  });
});
