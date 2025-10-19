import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';

import { WorkspaceStoreService } from '../../services/workspace-store.service';

@Component({
  selector: 'tf-workspace-overview',
  templateUrl: './workspace-overview.component.html',
  styleUrls: ['./workspace-overview.component.scss'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceOverviewComponent {
  private readonly workspaceStore = inject(WorkspaceStoreService);
  private readonly route = inject(ActivatedRoute);
  private readonly sectionDescriptors: Record<
    string,
    { title: string; description: string; emptyState: string; action: string }
  > = {
    overview: {
      title: 'Workspace Overview',
      description: 'Manage spaces and switch context from the workspace list in the sidebar.',
      emptyState: 'Select a workspace from the sidebar to get started.',
      action: 'Choose another workspace from the sidebar whenever you need to collaborate with a different team.'
    },
    teams: {
      title: 'Teams & Members',
      description: 'Manage people, roles, and invitations for this workspace.',
      emptyState: 'No workspace selected. Pick one to manage members.',
      action: 'Add teammates, adjust roles, and control who has access to this workspace.'
    },
    projects: {
      title: 'Projects & Labels',
      description: 'Organize how tasks roll up into initiatives, sprints, or spaces.',
      emptyState: 'No workspace selected. Select one to manage projects.',
      action: 'Curate projects, folders, or lists to match the way your team ships work.'
    },
    reports: {
      title: 'Reports & Insights',
      description: 'Track activity, velocity, and workload across the workspace.',
      emptyState: 'No workspace selected. Select one to view reporting.',
      action: 'Configure dashboards and saved views to monitor delivery and risk in real time.'
    },
    billing: {
      title: 'Billing & Plans',
      description: 'Update payment methods, invoices, and plan details.',
      emptyState: 'No workspace selected. Select one to review billing.',
      action: 'Keep payment details current and track plan usage without leaving your work.'
    },
    settings: {
      title: 'Settings & Integrations',
      description: 'Fine-tune workspace preferences and connect external tools.',
      emptyState: 'No workspace selected. Select one to configure settings.',
      action: 'Manage automation, integrations, and workspace defaults in one place.'
    }
  };

  protected readonly activeWorkspace = toSignal(this.workspaceStore.observeWorkspace(), {
    initialValue: null
  });

  protected readonly workspaces = toSignal(this.workspaceStore.observeWorkspaces(), {
    initialValue: []
  });
  protected readonly workspaceSection = signal('overview');
  protected readonly sectionConfig = computed(() => {
    const section = this.workspaceSection();
    return this.sectionDescriptors[section] ?? this.sectionDescriptors['overview'];
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map(params => ({
          workspaceId: params.get('workspaceId'),
          section: params.get('section') ?? 'overview'
        })),
        takeUntilDestroyed()
      )
      .subscribe(({ workspaceId, section }) => {
        this.workspaceSection.set(section);

        if (workspaceId) {
          this.workspaceStore.selectWorkspace(workspaceId);
        }
      });
  }
}
