import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService, NotificationData } from '../../services/notification';

@Component({
  selector: 'app-notifications',
  imports: [],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class Notifications implements OnInit {
  notifications: NotificationData[] = [];
  isLoading = false;
  currentPage = 1;
  totalPages = 1;
  unreadOnly = false;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(page: number = 1): void {
    this.isLoading = true;
    this.currentPage = page;

    this.notificationService.getNotifications(page, this.unreadOnly).subscribe({
      next: (response) => {
        if (page === 1) {
          this.notifications = response.data;
        } else {
          this.notifications = [...this.notifications, ...response.data];
        }
        this.totalPages = response.last_page || 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
        this.isLoading = false;
      },
    });
  }

  loadMore(): void {
    if (this.currentPage < this.totalPages && !this.isLoading) {
      this.loadNotifications(this.currentPage + 1);
    }
  }

  markAsRead(notification: NotificationData): void {
    if (!notification.read_at) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.read_at = new Date().toISOString();
          this.notificationService.decrementUnreadCount();
        },
        error: (err) => {
          console.error('Failed to mark notification as read:', err);
        },
      });
    }

    // Navigate if there's an action URL
    if (notification.data.action_url) {
      this.router.navigate([notification.data.action_url]);
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach((n) => {
          n.read_at = new Date().toISOString();
        });
        this.notificationService.resetUnreadCount();
      },
      error: (err) => {
        console.error('Failed to mark all notifications as read:', err);
      },
    });
  }

  deleteNotification(notification: NotificationData, event: MouseEvent): void {
    event.stopPropagation();

    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        const index = this.notifications.findIndex((n) => n.id === notification.id);
        if (index > -1) {
          if (!notification.read_at) {
            this.notificationService.decrementUnreadCount();
          }
          this.notifications.splice(index, 1);
        }
      },
      error: (err) => {
        console.error('Failed to delete notification:', err);
      },
    });
  }

  filterByRead(readOnly: boolean): void {
    this.unreadOnly = readOnly;
    this.currentPage = 1;
    this.loadNotifications();
  }

  getNotificationIcon(notification: NotificationData): string {
    return notification.data.icon || 'bell';
  }

  getNotificationColor(notification: NotificationData): string {
    return notification.data.color || 'blue';
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  }
}
