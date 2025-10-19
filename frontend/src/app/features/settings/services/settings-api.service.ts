import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Subscription } from '../../../shared/models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  loadSubscription(): Observable<Subscription> {
    return of({
      planId: 'team-pro',
      planName: 'Team Pro',
      billingInterval: 'monthly',
      seatsPurchased: 10,
      seatsInUse: 6,
      renewsOn: new Date().toISOString()
    });
  }
}
