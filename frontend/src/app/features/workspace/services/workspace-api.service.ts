import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { Organization } from '../../../shared/models/organization.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceApiService {
  constructor(private readonly api: ApiService) {}

  loadCurrent(): Observable<Organization> {
    return this.listWorkspaces().pipe(map(workspaces => workspaces[0]));
  }

  listWorkspaces(): Observable<Organization[]> {
    const now = new Date().toISOString();

    return of([
      {
        id: 'workspace-1',
        name: 'Growth Workspace',
        defaultLocale: 'en',
        createdAt: now
      },
      {
        id: 'workspace-2',
        name: 'Product Ops',
        defaultLocale: 'en',
        createdAt: now
      },
      {
        id: 'workspace-3',
        name: 'Client Success',
        defaultLocale: 'fr',
        createdAt: now
      }
    ]);
  }
}
