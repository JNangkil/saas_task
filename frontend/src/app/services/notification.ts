import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationData {
  id: string;
  type: string;
  data: {
    title: string;
    body: string;
    action_url?: string;
    icon?: string;
    color?: string;
  };
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  [key: string]: {
    in_app: boolean;
    email: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl = environment.apiUrl;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get notifications with pagination
   */
  getNotifications(page: number = 1, unreadOnly: boolean = false): Observable<any> {
    const params: any = {
      page,
      per_page: 20,
    };

    if (unreadOnly) {
      params.unread_only = true;
    }

    return this.http.get(`${this.apiUrl}/notifications`, { params });
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/notifications/unread-count`);
  }

  /**
   * Update unread count
   */
  updateUnreadCount(): void {
    this.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadCountSubject.next(response.count);
      },
      error: (err) => {
        console.error('Failed to fetch unread count:', err);
      },
    });
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notifications/${notificationId}/read`, {});
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<any> {
    return this.http.patch(`${this.apiUrl}/notifications/read-all`, {});
  }

  /**
   * Delete a notification
   */
  deleteNotification(notificationId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notifications/${notificationId}`);
  }

  /**
   * Get notification preferences
   */
  getNotificationPreferences(): Observable<{ preferences: NotificationPreferences }> {
    return this.http.get<{ preferences: NotificationPreferences }>(
      `${this.apiUrl}/users/me/notification-preferences`
    );
  }

  /**
   * Update notification preferences
   */
  updateNotificationPreferences(preferences: NotificationPreferences): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/me/notification-preferences`, {
      preferences,
    });
  }

  /**
   * Handle new notification (e.g., from WebSocket)
   */
  handleNewNotification(notification: NotificationData): void {
    // Update unread count if the notification is unread
    if (!notification.read_at) {
      const currentCount = this.unreadCountSubject.value;
      this.unreadCountSubject.next(currentCount + 1);
    }
  }

  /**
   * Decrease unread count by one
   */
  decrementUnreadCount(): void {
    const currentCount = this.unreadCountSubject.value;
    if (currentCount > 0) {
      this.unreadCountSubject.next(currentCount - 1);
    }
  }

  /**
   * Reset unread count to zero
   */
  resetUnreadCount(): void {
    this.unreadCountSubject.next(0);
  }
}
