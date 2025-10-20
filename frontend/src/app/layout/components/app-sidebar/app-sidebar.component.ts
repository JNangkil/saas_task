import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { WorkspaceApiService } from '../../../features/workspace/services/workspace-api.service';
import { WorkspaceStoreService } from '../../../features/workspace/services/workspace-store.service';
import { Organization } from '../../../shared/models/organization.model';

@Component({
  standalone: false,
  selector: 'app-app-sidebar',
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSidebarComponent {
  private readonly auth = inject(AuthService);
  private readonly workspaceApi = inject(WorkspaceApiService);
  private readonly workspaceStore = inject(WorkspaceStoreService);
  private readonly router = inject(Router);
  @ViewChild('brandTrigger', { static: false }) private brandTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('brandMenu', { static: false }) private brandMenu?: ElementRef<HTMLDivElement>;

  protected readonly user$ = this.auth.currentUser();

  protected readonly workspaces = toSignal(this.workspaceStore.observeWorkspaces(), { initialValue: [] });
  protected readonly activeWorkspaceId = toSignal(this.workspaceStore.observeActiveWorkspaceId(), {
    initialValue: null
  });
  protected readonly activeWorkspace = toSignal(this.workspaceStore.observeWorkspace(), {
    initialValue: null
  });
  protected readonly isBrandMenuOpen = signal(false);
  protected readonly activeWorkspaceSection = signal('overview');
  protected readonly workspaceActions = [
    { label: 'Workspace Overview', description: 'Home for this workspace', section: 'overview', icon: 'HO' },
    { label: 'Teams & Members', description: 'Manage people and roles', section: 'teams', icon: 'TM' },
    { label: 'Projects & Labels', description: 'Organize how work is grouped', section: 'projects', icon: 'PL' },
    { label: 'Reports & Insights', description: 'See activity across the workspace', section: 'reports', icon: 'RI' },
    { label: 'Billing & Plans', description: 'Subscription and payment details', section: 'billing', icon: 'BP' },
    { label: 'Settings & Integrations', description: 'Configure tools and preferences', section: 'settings', icon: 'SI' }
  ];

  constructor() {
    this.workspaceApi
      .listWorkspaces()
      .pipe(take(1))
      .subscribe(workspaces => {
        this.workspaceStore.setWorkspaces(workspaces);

        const workspaceFromUrl = this.extractWorkspaceIdFromUrl(this.router.url);
        if (workspaceFromUrl) {
          this.workspaceStore.selectWorkspace(workspaceFromUrl);
        }
      });

    this.setActiveSectionFromUrl(this.router.url);
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(event => {
        this.setActiveSectionFromUrl((event as NavigationEnd).urlAfterRedirects);
      });
  }

  protected selectWorkspace(workspace: Organization): void {
    this.workspaceStore.selectWorkspace(workspace.id);
  }

  protected toggleWorkspaceMenu(): void {
    this.isBrandMenuOpen.update(open => !open);
  }

  protected closeWorkspaceMenu(): void {
    this.isBrandMenuOpen.set(false);
  }

  protected navigateWorkspaceSection(section: string): void {
    const activeId = this.activeWorkspaceId();
    if (!activeId) {
      return;
    }

    this.closeWorkspaceMenu();

    if (section === 'overview') {
      void this.router.navigate(['/workspace', activeId, 'overview']);
      return;
    }

    void this.router.navigate(['/workspace', activeId, section]);
  }

  protected openWorkspaceCreation(): void {
    this.closeWorkspaceMenu();
    const activeId = this.activeWorkspaceId();
    const commands = activeId ? ['/workspace', activeId, 'overview'] : ['/workspace'];

    void this.router.navigate(commands, {
      queryParams: { create: '1' },
      queryParamsHandling: 'merge'
    });
  }

  protected workspaceInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return 'WS';
    }

    if (words.length === 1) {
      const camelCaseMatches = words[0].match(/[A-Z]/g);

      if (camelCaseMatches && camelCaseMatches.length >= 2) {
        return `${camelCaseMatches[0]}${camelCaseMatches[1]}`.toUpperCase();
      }

      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  protected trackByWorkspaceId(_index: number, workspace: Organization): string {
    return workspace.id;
  }

  private extractWorkspaceIdFromUrl(url: string): string | null {
    const pathMatch = url.match(/\/workspace\/([^/?]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    const queryMatch = url.match(/[?&]workspaceId=([^&]+)/);
    return queryMatch ? queryMatch[1] : null;
  }

  private setActiveSectionFromUrl(url: string): void {
    const sectionMatch = url.match(/\/workspace\/[^/]+\/([^/?]+)/);
    const section = sectionMatch ? sectionMatch[1] : 'overview';
    this.activeWorkspaceSection.set(section);
  }

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: MouseEvent): void {
    if (!this.isBrandMenuOpen()) {
      return;
    }

    const target = event.target as Node | null;
    if (!target) {
      return;
    }

    const triggerEl = this.brandTrigger?.nativeElement;
    const menuEl = this.brandMenu?.nativeElement;

    if (triggerEl?.contains(target) || menuEl?.contains(target)) {
      return;
    }

    this.closeWorkspaceMenu();
  }

  protected handleWorkspaceMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.closeWorkspaceMenu();
    }
  }
}
