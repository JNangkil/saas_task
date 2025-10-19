import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';

interface SidebarNavItem {
  label: string;
  route: string;
  icon: string;
  badge?: string;
}

interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

@Component({
  standalone: false,
  selector: 'app-app-sidebar',
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSidebarComponent {
  private readonly auth = inject(AuthService);

  protected readonly user$ = this.auth.currentUser();

  protected readonly navGroups = signal<SidebarNavGroup[]>([
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', route: '/dashboard', icon: 'DB' }]
    },
    {
      label: 'Work Management',
      items: [
        { label: 'Projects', route: '/projects', icon: 'PR' },
        { label: 'Tasks', route: '/tasks', icon: 'TK' },
        { label: 'Teams', route: '/teams', icon: 'TM' }
      ]
    },
    {
      label: 'Insights',
      items: [
        { label: 'Reports', route: '/reports', icon: 'RP', badge: 'Beta' }
      ]
    },
    {
      label: 'Administration',
      items: [
        { label: 'Workspace', route: '/workspace', icon: 'WS' },
        { label: 'Settings', route: '/settings', icon: 'ST' }
      ]
    }
  ]);
}
