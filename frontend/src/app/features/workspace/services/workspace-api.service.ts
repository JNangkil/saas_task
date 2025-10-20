import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { Organization } from '../../../shared/models/organization.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceApiService {
  constructor(private readonly api: ApiService) {}

  loadCurrent(): Observable<Organization> {
    return this.listWorkspaces().pipe(
      map(workspaces => {
        if (!workspaces.length) {
          throw new Error('No workspaces available for the current user.');
        }

        return workspaces[0];
      })
    );
  }

  listWorkspaces(): Observable<Organization[]> {
    return this.api.get<{ data: WorkspaceResponse[] }>('workspaces').pipe(
      map(response => response.data.map(dto => this.mapToOrganization(dto)))
    );
  }

  createWorkspace(payload: WorkspaceCreatePayload): Observable<Organization> {
    return this.api
      .post<{ data: WorkspaceResponse }>('workspaces', this.mapToApiPayload(payload))
      .pipe(map(response => this.mapToOrganization(response.data)));
  }

  updateWorkspace(workspaceId: string, payload: WorkspaceUpdatePayload): Observable<Organization> {
    return this.api
      .patch<{ data: WorkspaceResponse }>(`workspaces/${workspaceId}`, this.mapToApiPayload(payload))
      .pipe(map(response => this.mapToOrganization(response.data)));
  }

  deleteWorkspace(workspaceId: string): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`workspaces/${workspaceId}`);
  }

  private mapToOrganization(dto: WorkspaceResponse): Organization {
    return {
      id: dto.id,
      name: dto.name,
      logoUrl: dto.logoUrl ?? null,
      defaultLocale: dto.defaultLocale,
      createdAt: dto.createdAt,
      membershipRole: dto.membershipRole
    };
  }

  private mapToApiPayload(
    payload: WorkspaceCreatePayload | WorkspaceUpdatePayload
  ): WorkspaceRequestPayload {
    const request: WorkspaceRequestPayload = {};

    if ('name' in payload && payload.name !== undefined) {
      request.name = payload.name;
    }

    if ('defaultLocale' in payload && payload.defaultLocale !== undefined) {
      request.default_locale = payload.defaultLocale;
    }

    if ('logoUrl' in payload) {
      request.logo_url = payload.logoUrl ?? null;
    }

    return request;
  }
}

interface WorkspaceResponse {
  id: string;
  name: string;
  logoUrl: string | null;
  defaultLocale: 'en' | 'es' | 'fr';
  createdAt: string;
  membershipRole: 'Owner' | 'Admin' | 'Member';
}

export type WorkspaceCreatePayload = {
  name: string;
  defaultLocale?: 'en' | 'es' | 'fr';
  logoUrl?: string | null;
};

export type WorkspaceUpdatePayload = Partial<WorkspaceCreatePayload>;

type WorkspaceRequestPayload = {
  name?: string;
  default_locale?: 'en' | 'es' | 'fr';
  logo_url?: string | null;
};
