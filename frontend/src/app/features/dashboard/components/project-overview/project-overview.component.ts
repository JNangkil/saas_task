import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface DashboardProjectOverview {
  id: string;
  name: string;
  status: string;
  statusTone: 'neutral' | 'success' | 'warning' | 'danger';
  progress: number;
  owner: string;
  dueDate: string;
  openTasks: number;
  completedTasks: number;
}

@Component({
  standalone: false,
  selector: 'app-project-overview',
  templateUrl: './project-overview.component.html',
  styleUrls: ['./project-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectOverviewComponent {
  @Input() heading = 'Projects at a glance';
  @Input() projects: DashboardProjectOverview[] = [];

  protected completionRatio(project: DashboardProjectOverview): number {
    const total = project.openTasks + project.completedTasks;
    if (!total) {
      return 0;
    }

    return Math.round((project.completedTasks / total) * 100);
  }

  protected dueIn(project: DashboardProjectOverview): string {
    const dueDate = new Date(project.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      return 'No due date';
    }

    const now = new Date();
    const oneDay = 86_400_000;
    const diff = dueDate.getTime() - now.getTime();
    const days = Math.round(diff / oneDay);

    if (days === 0) {
      return 'Due today';
    }

    if (days > 0) {
      return `Due in ${days}d`;
    }

    return `${Math.abs(days)}d overdue`;
  }
}
