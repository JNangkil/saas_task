import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface DashboardTaskBreakdownItem {
  label: string;
  count: number;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface DashboardTaskSummary {
  overdue: number;
  dueToday: number;
  dueSoon: number;
  completedThisWeek: number;
  statusBreakdown: DashboardTaskBreakdownItem[];
  priorityBreakdown: DashboardTaskBreakdownItem[];
}

@Component({
  standalone: false,
  selector: 'app-task-summary',
  templateUrl: './task-summary.component.html',
  styleUrls: ['./task-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskSummaryComponent {
  @Input() heading = 'Task health';
  @Input() summary?: DashboardTaskSummary;

  protected totalTrackedTasks(): number {
    if (!this.summary) {
      return 0;
    }

    return this.summary.statusBreakdown.reduce((total, item) => total + item.count, 0);
  }

  protected percentage(part: number): number {
    const total = this.totalTrackedTasks();
    if (!total) {
      return 0;
    }

    return Math.round((part / total) * 100);
  }
}
