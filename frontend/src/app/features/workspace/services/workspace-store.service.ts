import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { Organization } from '../../../shared/models/organization.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceStoreService {
  private readonly workspace$ = new BehaviorSubject<Organization | null>(null);

  setWorkspace(workspace: Organization): void {
    this.workspace$.next(workspace);
  }

  observeWorkspace(): Observable<Organization | null> {
    return this.workspace$.asObservable();
  }
}
