import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Organization } from '../../../shared/models/organization.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceStoreService {
  private readonly workspaces$ = new BehaviorSubject<Organization[]>([]);
  private readonly activeWorkspaceId$ = new BehaviorSubject<string | null>(null);

  setWorkspaces(workspaces: Organization[]): void {
    this.workspaces$.next(workspaces);

    const currentActiveId = this.activeWorkspaceId$.value;
    const containsActive = currentActiveId
      ? workspaces.some(workspace => workspace.id === currentActiveId)
      : false;

    if (workspaces.length === 0) {
      this.activeWorkspaceId$.next(null);
      return;
    }

    if (!containsActive) {
      this.activeWorkspaceId$.next(workspaces[0].id);
    }
  }

  selectWorkspace(workspaceId: string): void {
    if (this.activeWorkspaceId$.value === workspaceId) {
      return;
    }

    this.activeWorkspaceId$.next(workspaceId);
  }

  observeWorkspaces(): Observable<Organization[]> {
    return this.workspaces$.asObservable();
  }

  observeActiveWorkspaceId(): Observable<string | null> {
    return this.activeWorkspaceId$.asObservable();
  }

  observeWorkspace(): Observable<Organization | null> {
    return combineLatest([this.workspaces$, this.activeWorkspaceId$]).pipe(
      map(([workspaces, activeId]) => workspaces.find(workspace => workspace.id === activeId) ?? null)
    );
  }
}
