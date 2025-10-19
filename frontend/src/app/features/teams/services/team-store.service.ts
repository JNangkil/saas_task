import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { User } from '../../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class TeamStoreService {
  private readonly members$ = new BehaviorSubject<User[]>([]);

  setMembers(members: User[]): void {
    this.members$.next(members);
  }

  observeMembers(): Observable<User[]> {
    return this.members$.asObservable();
  }
}
