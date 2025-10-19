import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { Task } from '../../../shared/models/task.model';

@Injectable({ providedIn: 'root' })
export class TasksApiService {
  constructor(private readonly api: ApiService) {}

  list(): Observable<Task[]> {
    return of([]);
  }
}
