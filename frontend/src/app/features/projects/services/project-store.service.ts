import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { Project } from '../../../shared/models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectStoreService {
  private readonly projects$ = new BehaviorSubject<Project[]>([]);

  setProjects(projects: Project[]): void {
    this.projects$.next(projects);
  }

  observeProjects(): Observable<Project[]> {
    return this.projects$.asObservable();
  }
}
