import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { Notification, NotificationsPaginatedResponse, NotificationCount } from '../models/user.model';

/**
 * User notification service for managing in-app notifications
 */
@Injectable({
    providedIn: 'root'
})
export class UserNotificationService {
    private unreadCount$ = new BehaviorSubject<number>(0);

    constructor(private apiService: ApiService) {
        this.loadUnreadCount();
    }

    /**
     * Get all notifications for the current user
     *
     * @param page Page number (default: 1)
     * @param perPage Items per page (default: 20)
     * @param unreadOnly Whether to fetch only unread notifications (default: false)
     * @returns Observable<NotificationsPaginatedResponse> Paginated notifications
     */
    getNotifications(page: number = 1, perPage: number = 20, unreadOnly: boolean = false): Observable<NotificationsPaginatedResponse> {
        const params: any = {
            page: page.toString(),
            per_page: Math.min(perPage, 100).toString()
        };

        if (unreadOnly) {
            params.unread_only = 'true';
        }

        return this.apiService.get<NotificationsPaginatedResponse>('notifications', { params });
    }

    /**
     * Get unread notification count
     *
     * @returns Observable<number> Number of unread notifications
     */
    getUnreadCount(): Observable<number> {
        return this.unreadCount$.asObservable();
    }

    /**
     * Load and update unread count
     */
    loadUnreadCount(): void {
        this.apiService.get<NotificationCount>('notifications/unread-count').subscribe(
            response => {
                this.unreadCount$.next(response.count);
            },
            error => {
                console.error('Failed to load unread count:', error);
            }
        );
    }

    /**
     * Mark a notification as read
     *
     * @param notificationId The notification ID
     * @returns Observable<any> Response from API
     */
    markAsRead(notificationId: string): Observable<any> {
        return this.apiService.patch(`notifications/${notificationId}/read`);
    }

    /**
     * Mark all notifications as read
     *
     * @returns Observable<any> Response from API
     */
    markAllAsRead(): Observable<any> {
        return this.apiService.patch('notifications/mark-all-read').pipe(
            // Update local count after successful API call
            (response) => {
                this.unreadCount$.next(0);
                return response;
            }
        );
    }

    /**
     * Delete a notification
     *
     * @param notificationId The notification ID
     * @returns Observable<any> Response from API
     */
    deleteNotification(notificationId: string): Observable<any> {
        return this.apiService.delete(`notifications/${notificationId}`);
    }

    /**
     * Refresh unread count
     */
    refreshUnreadCount(): void {
        this.loadUnreadCount();
    }

    /**
     * Decrement unread count (useful for real-time updates)
     *
     * @param count Number to decrement by (default: 1)
     */
    decrementUnreadCount(count: number = 1): void {
        const currentCount = this.unreadCount$.value;
        const newCount = Math.max(0, currentCount - count);
        this.unreadCount$.next(newCount);
    }

    /**
     * Increment unread count (useful for real-time updates)
     *
     * @param count Number to increment by (default: 1)
     */
    incrementUnreadCount(count: number = 1): void {
        const currentCount = this.unreadCount$.value;
        this.unreadCount$.next(currentCount + count);
    }
}