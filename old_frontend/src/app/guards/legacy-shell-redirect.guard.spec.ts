import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, convertToParamMap, provideRouter } from '@angular/router';
import { legacyShellRedirectGuard } from './legacy-shell-redirect.guard';

describe('legacyShellRedirectGuard', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])]
    });

    router = TestBed.inject(Router);
  });

  it('redirects legacy dashboard links to the workspace shell root', () => {
    const result = TestBed.runInInjectionContext(() => legacyShellRedirectGuard({
      paramMap: convertToParamMap({}),
      queryParams: {}
    } as any, {} as any)) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/app');
  });

  it('preserves workspace and board targets for direct legacy board links', () => {
    const result = TestBed.runInInjectionContext(() => legacyShellRedirectGuard({
      paramMap: convertToParamMap({ workspaceId: '12', boardId: '48' }),
      queryParams: { view: 'kanban' },
      routeConfig: { path: 'workspaces/:workspaceId/boards/:boardId' }
    } as any, {} as any)) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/app/12/boards/48?view=kanban');
  });

  it('preserves board settings targets when the legacy route points at settings', () => {
    const result = TestBed.runInInjectionContext(() => legacyShellRedirectGuard({
      paramMap: convertToParamMap({ workspaceId: '7', boardId: '19' }),
      queryParams: {},
      routeConfig: { path: 'workspaces/:workspaceId/boards/:boardId/settings' }
    } as any, {} as any)) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/app/7/boards/19/settings');
  });
});
