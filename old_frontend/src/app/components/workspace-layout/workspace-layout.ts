import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { Sidebar } from '../sidebar/sidebar';
import { WorkspaceShellService, ShellRouteRequest } from '../../services/workspace-shell.service';

@Component({
  selector: 'app-workspace-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar],
  templateUrl: './workspace-layout.html',
  styleUrl: './workspace-layout.css',
})
export class WorkspaceLayout implements OnInit, OnDestroy {
  readonly loading$;
  readonly ready$;
  readonly error$;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private workspaceShellService: WorkspaceShellService
  ) {
    this.loading$ = this.workspaceShellService.loading$;
    this.ready$ = this.workspaceShellService.ready$;
    this.error$ = this.workspaceShellService.error$;
  }

  ngOnInit(): void {
    this.router.events.pipe(
      startWith(null),
      filter((event) => event === null || event instanceof NavigationEnd),
      map(() => this.getRouteRequest()),
      switchMap((request) => this.workspaceShellService.syncRoute(request)),
      takeUntil(this.destroy$)
    ).subscribe((result) => {
      if (result.redirectUrl && result.redirectUrl !== this.router.url) {
        this.router.navigateByUrl(result.redirectUrl, { replaceUrl: true });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getRouteRequest(): ShellRouteRequest {
    const deepestChild = this.getDeepestChild(this.activatedRoute);
    const workspaceId = deepestChild.snapshot.paramMap.get('workspaceId');
    const boardId = deepestChild.snapshot.paramMap.get('boardId');
    const url = this.router.url;

    if (boardId) {
      return {
        workspaceId,
        boardId,
        surface: url.endsWith('/settings') ? 'settings' : 'board'
      };
    }

    if (!workspaceId) {
      return {
        workspaceId: null,
        boardId: null,
        surface: 'auto'
      };
    }

    return {
      workspaceId,
      boardId: null,
      surface: url.endsWith('/home') ? 'home' : 'workspace'
    };
  }

  private getDeepestChild(route: ActivatedRoute): ActivatedRoute {
    let current = route;

    while (current.firstChild) {
      current = current.firstChild;
    }

    return current;
  }
}
