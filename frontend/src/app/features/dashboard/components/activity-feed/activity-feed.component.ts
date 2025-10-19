import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface DashboardActivityItem {
  id: string;
  actor: string;
  description: string;
  target: string;
  timestamp: string;
  statusLabel?: string;
  statusTone?: 'neutral' | 'success' | 'warning' | 'danger';
}

@Component({
  standalone: false,
  selector: 'app-activity-feed',
  templateUrl: './activity-feed.component.html',
  styleUrls: ['./activity-feed.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityFeedComponent {
  @Input() heading = 'Recent activity';
  @Input() items: DashboardActivityItem[] = [];

  protected relativeTime(timestamp: string): string {
    const eventDate = new Date(timestamp);
    if (Number.isNaN(eventDate.getTime())) {
      return '';
    }

    const now = Date.now();
    const diff = now - eventDate.getTime();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
      return 'Just now';
    }

    if (diff < hour) {
      const minutes = Math.round(diff / minute);
      return `${minutes}m ago`;
    }

    if (diff < day) {
      const hours = Math.round(diff / hour);
      return `${hours}h ago`;
    }

    const days = Math.round(diff / day);
    return `${days}d ago`;
  }
}
