import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { Project } from '../../../shared/models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  constructor(private readonly api: ApiService) {}

  list(): Observable<Project[]> {
    return of([]);
  }
}
