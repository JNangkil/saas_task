import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { Organization } from '../../../shared/models/organization.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceApiService {
  constructor(private readonly api: ApiService) {}

  loadCurrent(): Observable<Organization> {
    return of({
      id: 'workspace-1',
      name: 'Demo Workspace',
      defaultLocale: 'en',
      createdAt: new Date().toISOString()
    });
  }
}
