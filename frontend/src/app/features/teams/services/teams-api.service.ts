import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { User } from '../../../shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class TeamsApiService {
  constructor(private readonly api: ApiService) {}

  listMembers(teamId: string): Observable<User[]> {
    return of([]);
  }
}
