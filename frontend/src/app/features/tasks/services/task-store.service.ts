import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { Task } from '../../../shared/models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskStoreService {
  private readonly tasks$ = new BehaviorSubject<Task[]>([]);

  setTasks(tasks: Task[]): void {
    this.tasks$.next(tasks);
  }

  observeTasks(): Observable<Task[]> {
    return this.tasks$.asObservable();
  }
}
