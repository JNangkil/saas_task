import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  WorkspaceFormValue,
  WorkspaceSettingsFormComponent
} from '../../components/workspace-settings-form/workspace-settings-form.component';
import { WorkspaceBillingSummary } from '../../components/billing-summary/workspace-billing-summary.component';
import { WorkspaceApiService } from '../../services/workspace-api.service';
import { WorkspaceStoreService } from '../../services/workspace-store.service';

@Component({
  selector: 'tf-workspace-overview-page',
  templateUrl: './workspace-overview-page.component.html',
  styleUrls: ['./workspace-overview-page.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, WorkspaceSettingsFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceOverviewPageComponent {
  private readonly workspaceStore = inject(WorkspaceStoreService);
  private readonly workspaceApi = inject(WorkspaceApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeWorkspace = toSignal(this.workspaceStore.observeWorkspace(), {
    initialValue: null
  });

  protected readonly workspaces = toSignal(this.workspaceStore.observeWorkspaces(), {
    initialValue: []
  });
  protected readonly isCreating = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly statusMessage = signal<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  protected readonly hasAnyWorkspace = computed(() => this.workspaces().length > 0);
  protected readonly activeWorkspaceId = computed(() => this.activeWorkspace()?.id ?? null);
  protected readonly primaryWorkspace = computed(() => {
    const active = this.activeWorkspace();
    if (active) {
      return active;
    }

    const all = this.workspaces();
    return all.length ? all[0] : null;
  });
  protected readonly primaryWorkspaceId = computed(() => this.primaryWorkspace()?.id ?? null);
  protected readonly hasMultipleWorkspaces = computed(() => this.workspaces().length > 1);
  protected readonly workspaceMetrics = signal([
    { label: 'Active spaces', value: 6, delta: '+2 vs last week' },
    { label: 'Tasks due soon', value: 18, delta: '5 due today' },
    { label: 'Docs created', value: 42, delta: '3 new this week' },
    { label: 'Members engaged', value: '87%', delta: '↑ 12% from last week' }
  ]);
  protected readonly quickStartItems = signal([
    {
      label: 'Invite your teammates',
      description: 'Bring collaborators into this workspace to assign tasks and share docs.',
      action: () => this.goToMembers(),
      done: false
    },
    {
      label: 'Create your first space',
      description: 'Organize projects by creating a space for each major initiative.',
      action: () => this.goToSettings(),
      done: false
    },
    {
      label: 'Publish a kickoff doc',
      description: 'Align the team with a shared plan, agenda, or brief.',
      action: undefined,
      done: true
    }
  ]);
  protected readonly activityFeed = signal([
    {
      actor: 'Taylor Swift',
      action: 'completed “Build workspace overview wireframes” in Launch Plan',
      time: '8 minutes ago'
    },
    {
      actor: 'Jordan Blake',
      action: 'commented on “Product roadmap Q3” doc',
      time: '35 minutes ago'
    },
    {
      actor: 'Morgan Lee',
      action: 'created the space “Growth Experiments”',
      time: '1 hour ago'
    },
    {
      actor: 'Avery Chen',
      action: 'assigned you 3 tasks in “Customer journey revamp”',
      time: 'Yesterday'
    }
  ]);
  protected readonly workspaceMembers = signal([
    { name: 'Taylor Swift', role: 'Owner', status: 'Online', initials: 'TS' },
    { name: 'Jordan Blake', role: 'Admin', status: 'Offline', initials: 'JB' },
    { name: 'Morgan Lee', role: 'Member', status: 'Online', initials: 'ML' },
    { name: 'Avery Chen', role: 'Member', status: 'Invited', initials: 'AC' }
  ]);
  protected readonly workspaceShortcuts = computed(() => {
    const activeId = this.primaryWorkspaceId();

    return [
      {
        name: 'Launch Plan board',
        description: 'Kanban view tracking upcoming launch tasks.',
        icon: '🗂️',
        link: activeId ? ['/workspace', activeId, 'overview'] : ['/workspace']
      },
      {
        name: 'Team Wiki',
        description: 'Pinned docs and policies to keep everyone aligned.',
        icon: '📘',
        link: ['/docs']
      },
      {
        name: 'Weekly sync doc',
        description: 'Agenda for Monday stand-up with action items.',
        icon: '📝',
        link: ['/docs', 'weekly-sync']
      }
    ];
  });
  protected readonly recentDocs = signal([
    { title: 'Launch checklist', type: 'Doc', updated: '2h ago' },
    { title: 'Sprint 18 retro', type: 'Doc', updated: 'Yesterday' },
    { title: 'Roadmap Q3', type: 'Doc', updated: 'Mon' }
  ]);

  protected readonly billingSummary = computed<WorkspaceBillingSummary>(() => {
    const workspace = this.activeWorkspace();

    if (!workspace) {
      return {
        planName: 'Growth (trial)',
        seatsUsed: 0,
        seatsTotal: 5,
        nextInvoiceDate: '—',
        paymentMethod: 'Not configured'
      };
    }

    return {
      planName: `${workspace.name} growth`,
      seatsUsed: 5,
      seatsTotal: 10,
      nextInvoiceDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toLocaleDateString(),
      paymentMethod: 'Visa ••42'
    };
  });

  constructor() {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed()
      )
      .subscribe(params => {
        const workspaceId = params.get('workspaceId');

        if (workspaceId) {
          this.workspaceStore.selectWorkspace(workspaceId);
        }
      });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        const create = params.get('create');
        if (create === null) {
          return;
        }

        const normalized = create.toLowerCase();
        const shouldOpen = normalized !== '0' && normalized !== 'false' && normalized !== 'no';

        if (shouldOpen && !this.isCreating()) {
          this.startWorkspaceCreation();
        }

        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { create: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      });
  }

  protected startWorkspaceCreation(): void {
    this.isCreating.set(true);
    this.submitError.set(null);
    this.statusMessage.set(null);
  }

  protected cancelWorkspaceCreation(): void {
    if (this.isSaving()) {
      return;
    }

    this.isCreating.set(false);
    this.submitError.set(null);
  }

  protected handleCreateWorkspace(payload: WorkspaceFormValue): void {
    this.isSaving.set(true);
    this.submitError.set(null);
    this.statusMessage.set(null);

    this.workspaceApi
      .createWorkspace({
        name: payload.name,
        defaultLocale: payload.defaultLocale,
        logoUrl: payload.logoUrl
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: workspace => {
          this.workspaceStore.addWorkspace(workspace);
          this.workspaceStore.selectWorkspace(workspace.id);
          this.isCreating.set(false);
          this.statusMessage.set({
            type: 'success',
            text: `Workspace "${workspace.name}" created successfully.`
          });

          void this.router.navigate(['/workspace', workspace.id, 'settings']);
        },
        error: error => {
          this.submitError.set(this.extractErrorMessage(error, 'Unable to create workspace.'));
        }
      });
  }

  protected handleSelectWorkspace(workspaceId: string): void {
    this.workspaceStore.selectWorkspace(workspaceId);
    this.isCreating.set(false);
    this.submitError.set(null);
    this.statusMessage.set(null);

    void this.router.navigate(['/workspace', workspaceId, 'overview']);
  }

  protected goToSettings(): void {
    const workspace = this.activeWorkspace();

    if (!workspace) {
      return;
    }

    void this.router.navigate(['/workspace', workspace.id, 'settings']);
  }

  protected goToMembers(): void {
    const workspace = this.activeWorkspace();

    if (!workspace) {
      return;
    }

    void this.router.navigate(['/workspace', workspace.id, 'members']);
  }

  protected goToBilling(): void {
    const workspace = this.activeWorkspace();

    if (!workspace) {
      return;
    }

    void this.router.navigate(['/workspace', workspace.id, 'billing']);
  }

  protected workspaceInitials(name: string): string {
    if (!name.trim()) {
      return 'WS';
    }

    const words = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  protected trackByWorkspaceId(_index: number, workspace: { id: string }): string {
    return workspace.id;
  }

  protected trackByIndex(index: number): number {
    return index;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        return error.error;
      }

      if (error.error && typeof error.error === 'object' && 'message' in error.error) {
        const apiError = error.error as Record<string, unknown>;
        const message = apiError['message'];
        if (typeof message === 'string') {
          return message || fallback;
        }
      }
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const candidate = (error as { message?: unknown }).message;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }

    return fallback;
  }
}
