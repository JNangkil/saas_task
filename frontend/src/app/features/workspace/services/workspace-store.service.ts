import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Organization } from '../../../shared/models/organization.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceStoreService {
  private readonly workspaces$ = new BehaviorSubject<Organization[]>([]);
  private readonly activeWorkspaceId$ = new BehaviorSubject<string | null>(null);

  setWorkspaces(workspaces: Organization[]): void {
    const sorted = [...workspaces].sort((a, b) => a.name.localeCompare(b.name));
    this.workspaces$.next(sorted);

    const currentActiveId = this.activeWorkspaceId$.value;
    const containsActive = currentActiveId
      ? sorted.some(workspace => workspace.id === currentActiveId)
      : false;

    if (sorted.length === 0) {
      this.activeWorkspaceId$.next(null);
      return;
    }

    if (!containsActive) {
      this.activeWorkspaceId$.next(sorted[0].id);
    }
  }

  selectWorkspace(workspaceId: string): void {
    if (this.activeWorkspaceId$.value === workspaceId) {
      return;
    }

    this.activeWorkspaceId$.next(workspaceId);
  }

  addWorkspace(workspace: Organization): void {
    const updated = [...this.workspaces$.value, workspace].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    this.workspaces$.next(updated);
    this.activeWorkspaceId$.next(workspace.id);
  }

  updateWorkspace(workspace: Organization): void {
    const updated = this.workspaces$.value.map(existing =>
      existing.id === workspace.id ? workspace : existing
    );

    const sorted = [...updated].sort((a, b) => a.name.localeCompare(b.name));
    this.workspaces$.next(sorted);

    if (!this.activeWorkspaceId$.value && sorted.length) {
      this.activeWorkspaceId$.next(sorted[0].id);
    }
  }

  removeWorkspace(workspaceId: string): void {
    const remaining = this.workspaces$.value.filter(workspace => workspace.id !== workspaceId);
    this.workspaces$.next(remaining);

    if (remaining.length === 0) {
      this.activeWorkspaceId$.next(null);
      return;
    }

    if (this.activeWorkspaceId$.value === workspaceId) {
      this.activeWorkspaceId$.next(remaining[0].id);
    }
  }

  reset(): void {
    this.workspaces$.next([]);
    this.activeWorkspaceId$.next(null);
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

  getActiveWorkspaceId(): string | null {
    return this.activeWorkspaceId$.value;
  }

  getWorkspacesSnapshot(): Organization[] {
    return this.workspaces$.value;
  }
}
