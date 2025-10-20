import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { DashboardActivityItem } from '../../components/activity-feed/activity-feed.component';
import { DashboardProjectOverview } from '../../components/project-overview/project-overview.component';
import { DashboardTaskSummary } from '../../components/task-summary/task-summary.component';
import { WorkspaceStoreService } from '../../../workspace/services/workspace-store.service';

interface DashboardFocusItem {
  title: string;
  description: string;
  cta: string;
}

@Component({
  standalone: false,
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardHomeComponent {
  private readonly auth = inject(AuthService);
  private readonly workspaceStore = inject(WorkspaceStoreService);
  private readonly router = inject(Router);

  protected readonly user$ = this.auth.currentUser();
  protected readonly today = signal(new Date());

  protected readonly workspaces = toSignal(this.workspaceStore.observeWorkspaces(), {
    initialValue: []
  });
  protected readonly hasAnyWorkspace = computed(() => this.workspaces().length > 0);

  protected readonly taskSummary = signal<DashboardTaskSummary>({
    overdue: 6,
    dueToday: 5,
    dueSoon: 14,
    completedThisWeek: 32,
    statusBreakdown: [
      { label: 'Backlog', count: 18, tone: 'neutral' },
      { label: 'In progress', count: 26, tone: 'warning' },
      { label: 'Blocked', count: 4, tone: 'danger' }
    ],
    priorityBreakdown: [
      { label: 'Urgent', count: 3, tone: 'danger' },
      { label: 'High', count: 12, tone: 'warning' },
      { label: 'Medium', count: 21, tone: 'neutral' },
      { label: 'Low', count: 12, tone: 'success' }
    ]
  });

  protected readonly projectCards = signal<DashboardProjectOverview[]>([
    {
      id: 'p-aurora',
      name: 'Aurora website refresh',
      status: 'On track',
      statusTone: 'success',
      progress: 72,
      owner: 'Lena Hart',
      dueDate: '2025-11-03',
      openTasks: 14,
      completedTasks: 36
    },
    {
      id: 'p-onboard',
      name: 'Onboarding automation',
      status: 'At risk',
      statusTone: 'warning',
      progress: 58,
      owner: 'Nate Diaz',
      dueDate: '2025-10-28',
      openTasks: 22,
      completedTasks: 31
    },
    {
      id: 'p-mobile',
      name: 'Mobile beta program',
      status: 'Blocked',
      statusTone: 'danger',
      progress: 43,
      owner: 'Priya Patel',
      dueDate: '2025-11-12',
      openTasks: 18,
      completedTasks: 14
    }
  ]);

  protected readonly activityItems = signal<DashboardActivityItem[]>([
    {
      id: 'a-1',
      actor: 'Lena Hart',
      description: 'Completed the task "Finalize onboarding playbook" in',
      target: 'Project Aurora',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      statusLabel: 'Completed',
      statusTone: 'success'
    },
    {
      id: 'a-2',
      actor: 'Nate Diaz',
      description: 'Commented "Need legal review before launch" on',
      target: 'Task • Billing policy update',
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      statusLabel: 'Action required',
      statusTone: 'warning'
    },
    {
      id: 'a-3',
      actor: 'Priya Patel',
      description: 'Moved the task "iOS beta instrumentation" to Blocked in',
      target: 'Mobile beta program',
      timestamp: new Date(Date.now() - 1000 * 60 * 260).toISOString(),
      statusLabel: 'Blocked',
      statusTone: 'danger'
    }
  ]);

  protected readonly focusItems = signal<DashboardFocusItem[]>([
    {
      title: 'Prep onboarding review',
      description: '3 tasks due this afternoon across the onboarding automation workstream.',
      cta: 'View checklists'
    },
    {
      title: 'Resolve blocked items',
      description: 'Unblock the 4 critical tasks waiting on design approvals.',
      cta: 'Open task board'
    },
    {
      title: 'Review workspace health',
      description: 'Workload skewed toward 2 team members this week. Rebalance assignments.',
      cta: 'Open workload view'
    }
  ]);

  protected goToWorkspaceSetup(): void {
    void this.router.navigate(['/workspace'], { queryParams: { create: '1', from: 'dashboard' } });
  }
}
