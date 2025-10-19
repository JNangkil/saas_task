import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { WorkspaceStoreService } from '../../../features/workspace/services/workspace-store.service';

@Component({
  standalone: false,
  selector: 'app-app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppHeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  private readonly router = inject(Router);
  private readonly workspaceStore = inject(WorkspaceStoreService);

  protected readonly activeWorkspaceId = toSignal(this.workspaceStore.observeActiveWorkspaceId(), {
    initialValue: null
  });
  protected readonly activeWorkspaceSection = signal('overview');

  protected readonly systemLinks = computed(() => {
    const workspaceId = this.activeWorkspaceId();
    if (!workspaceId) {
      return [];
    }

    return [
      { label: 'Teams', short: 'TM', section: 'teams', route: ['/workspace', workspaceId, 'teams'] },
      { label: 'Projects', short: 'PR', section: 'projects', route: ['/workspace', workspaceId, 'projects'] },
      { label: 'Reports', short: 'RP', section: 'reports', route: ['/workspace', workspaceId, 'reports'] },
      { label: 'Billing', short: 'BL', section: 'billing', route: ['/workspace', workspaceId, 'billing'] },
      { label: 'Settings', short: 'ST', section: 'settings', route: ['/workspace', workspaceId, 'settings'] }
    ];
  });

  protected quickActions = [
    { label: 'New Task', icon: '+', action: 'task' },
    { label: 'Invite', icon: '⇪', action: 'invite' }
  ];

  constructor() {
    this.setActiveSectionFromUrl(this.router.url);
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(event => {
        this.setActiveSectionFromUrl((event as NavigationEnd).urlAfterRedirects);
      });
  }

  protected handleToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  protected isLinkActive(section: string): boolean {
    return this.activeWorkspaceSection() === section;
  }

  private setActiveSectionFromUrl(url: string): void {
    const sectionMatch = url.match(/\/workspace\/[^/]+\/([^/?]+)/);
    const section = sectionMatch ? sectionMatch[1] : 'overview';
    this.activeWorkspaceSection.set(section);
  }
}
