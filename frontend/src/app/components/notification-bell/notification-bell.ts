import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { NotificationService, NotificationData } from '../../services/notification';

@Component({
  selector: 'app-notification-bell',
  imports: [],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell implements OnInit, OnDestroy {
  unreadCount = 0;
  isOpen = false;
  recentNotifications: NotificationData[] = [];
  isLoading = false;
  private unreadCountSubscription: Subscription;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.unreadCountSubscription = this.notificationService.unreadCount$.subscribe(
      (count) => {
        this.unreadCount = count;
      }
    );
  }

  ngOnInit(): void {
    this.loadRecentNotifications();
    this.notificationService.updateUnreadCount();
  }

  ngOnDestroy(): void {
    this.unreadCountSubscription.unsubscribe();
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.recentNotifications.length === 0) {
      this.loadRecentNotifications();
    }
  }

  loadRecentNotifications(): void {
    this.isLoading = true;
    this.notificationService.getNotifications(1, false).subscribe({
      next: (response) => {
        this.recentNotifications = response.data.slice(0, 5);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load notifications:', err);
        this.isLoading = false;
      },
    });
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
      this.isOpen = false;
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.recentNotifications.forEach((n) => {
          n.read_at = new Date().toISOString();
        });
        this.notificationService.resetUnreadCount();
      },
      error: (err) => {
        console.error('Failed to mark all notifications as read:', err);
      },
    });
  }

  viewAll(): void {
    this.router.navigate(['/notifications']);
    this.isOpen = false;
  }

  deleteNotification(notificationId: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        // Remove from local array
        const index = this.recentNotifications.findIndex(n => n.id === notificationId);
        if (index > -1) {
          const notification = this.recentNotifications[index];
          if (!notification.read_at) {
            this.notificationService.decrementUnreadCount();
          }
          this.recentNotifications.splice(index, 1);
        }
      },
      error: (err) => {
        console.error('Failed to delete notification:', err);
      },
    });
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
