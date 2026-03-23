import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { BoardService } from '../../services/board.service';
import { WorkspaceContextService } from '../../services/workspace-context.service';
import { WorkspaceShellService } from '../../services/workspace-shell.service';
import { WorkspaceService } from '../../services/workspace.service';
import { BoardList } from './board-list';

describe('BoardList', () => {
  let component: BoardList;
  let fixture: ComponentFixture<BoardList>;
  let shellService: WorkspaceShellService;
  let boardService: jasmine.SpyObj<BoardService>;

  beforeEach(async () => {
    boardService = jasmine.createSpyObj<BoardService>('BoardService', [
      'getBoards',
      'favoriteBoard',
      'unfavoriteBoard',
      'archiveBoard',
      'getTemplates',
      'createBoard'
    ]);
    boardService.getTemplates.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [BoardList],
      providers: [
        provideRouter([]),
        WorkspaceShellService,
        WorkspaceContextService,
        {
          provide: WorkspaceService,
          useValue: jasmine.createSpyObj('WorkspaceService', ['getCurrentTenantWorkspaces'])
        },
        {
          provide: BoardService,
          useValue: boardService
        },
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: () => ({ id: 1, name: 'Board User', email: 'board@example.com' })
          }
        }
      ]
    }).compileComponents();

    shellService = TestBed.inject(WorkspaceShellService);
    TestBed.inject(WorkspaceContextService).setCurrentWorkspace({
      id: '1',
      tenant_id: '9',
      name: 'Product Ops',
      description: 'Workspace shell',
      is_archived: false,
      is_default: true,
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T00:00:00Z'
    });

    shellService.boards$.next([
      {
        id: 10,
        tenant_id: 9,
        workspace_id: 1,
        name: 'Alpha Board',
        description: 'Favorite board',
        type: 'kanban',
        position: 1,
        is_archived: false,
        is_favorite: true,
        created_at: '2026-03-19T00:00:00Z',
        updated_at: '2026-03-19T00:00:00Z'
      },
      {
        id: 20,
        tenant_id: 9,
        workspace_id: 1,
        name: 'Calendar Plan',
        description: 'Recent board',
        type: 'calendar',
        position: 2,
        is_archived: false,
        is_favorite: false,
        created_at: '2026-03-19T00:00:00Z',
        updated_at: '2026-03-19T00:00:00Z'
      }
    ]);
    shellService.favoriteBoards$.next([shellService.boards$.value[0]]);
    shellService.recentBoards$.next([shellService.boards$.value[1]]);

    fixture = TestBed.createComponent(BoardList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders favorite and recent board sections inside workspace home', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Favorite Boards');
    expect(element.textContent).toContain('Recent Boards');
    expect(element.textContent).toContain('Alpha Board');
    expect(element.textContent).toContain('Calendar Plan');
  });

  it('filters boards by the workspace search input', () => {
    component.searchText = 'calendar';

    expect(component.allBoards.map((board) => board.name)).toEqual(['Calendar Plan']);
  });

  it('registers a new board in the shell when board creation completes', () => {
    spyOn(shellService, 'registerBoard').and.callThrough();

    component.onBoardCreated({
      id: 30,
      tenant_id: 9,
      workspace_id: 1,
      name: 'Fresh Board',
      type: 'list',
      position: 3,
      is_archived: false,
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T00:00:00Z'
    } as any);

    expect(shellService.registerBoard).toHaveBeenCalled();
  });
});
