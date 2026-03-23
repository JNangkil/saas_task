import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BoardService } from './board.service';
import { WorkspaceContextService } from './workspace-context.service';
import { WorkspaceService } from './workspace.service';
import { WorkspaceShellService } from './workspace-shell.service';
import { Board } from '../models/board.model';
import { IWorkspace } from '../interfaces/workspace.interface';

describe('WorkspaceShellService', () => {
  let service: WorkspaceShellService;
  let workspaceService: jasmine.SpyObj<WorkspaceService>;
  let boardService: jasmine.SpyObj<BoardService>;
  let contextService: WorkspaceContextService;

  const workspace: IWorkspace = {
    id: '1',
    tenant_id: '9',
    name: 'Product Ops',
    description: 'Main workspace',
    is_archived: false,
    is_default: true,
    created_at: '2026-03-19T00:00:00Z',
    updated_at: '2026-03-19T00:00:00Z'
  };

  const board: Board = {
    id: 44,
    tenant_id: 9,
    workspace_id: 1,
    name: 'Launch Board',
    type: 'kanban',
    position: 1,
    is_archived: false,
    is_favorite: true,
    created_at: '2026-03-19T00:00:00Z',
    updated_at: '2026-03-19T00:00:00Z'
  };

  beforeEach(() => {
    localStorage.clear();

    workspaceService = jasmine.createSpyObj<WorkspaceService>('WorkspaceService', ['getCurrentTenantWorkspaces']);
    boardService = jasmine.createSpyObj<BoardService>('BoardService', [
      'getBoards',
      'favoriteBoard',
      'unfavoriteBoard',
      'archiveBoard'
    ]);

    TestBed.configureTestingModule({
      providers: [
        WorkspaceShellService,
        WorkspaceContextService,
        { provide: WorkspaceService, useValue: workspaceService },
        { provide: BoardService, useValue: boardService }
      ]
    });

    service = TestBed.inject(WorkspaceShellService);
    contextService = TestBed.inject(WorkspaceContextService);
  });

  it('restores the last active board for default shell landing', (done) => {
    localStorage.setItem('lastWorkspaceId', '1');
    localStorage.setItem('shellLastBoardByWorkspace', JSON.stringify({ '1': [44] }));

    workspaceService.getCurrentTenantWorkspaces.and.returnValue(of([workspace]));
    boardService.getBoards.and.returnValue(of([board]));

    service.syncRoute({ workspaceId: null, boardId: null, surface: 'auto' }).subscribe((result) => {
      expect(result.redirectUrl).toBe('/app/1/boards/44');
      expect(result.board?.id).toBe(44);
      expect(contextService.context.currentWorkspace?.id).toBe('1');
      expect(contextService.context.currentTenant?.id).toBe('9');
      done();
    });
  });

  it('falls back to workspace home when a direct board target is unavailable', (done) => {
    workspaceService.getCurrentTenantWorkspaces.and.returnValue(of([workspace]));
    boardService.getBoards.and.returnValue(of([]));

    service.syncRoute({ workspaceId: '1', boardId: '999', surface: 'board' }).subscribe((result) => {
      expect(result.redirectUrl).toBe('/app/1/home');
      expect(result.board).toBeNull();
      done();
    });
  });

  it('updates favorites and recents when a board is remembered', (done) => {
    workspaceService.getCurrentTenantWorkspaces.and.returnValue(of([workspace]));
    boardService.getBoards.and.returnValue(of([board]));

    service.syncRoute({ workspaceId: '1', boardId: '44', surface: 'board' }).subscribe(() => {
      expect(service.favoriteBoards$.value.map((item) => item.id)).toEqual([44]);
      expect(service.recentBoards$.value.map((item) => item.id)).toEqual([44]);
      done();
    });
  });
});
