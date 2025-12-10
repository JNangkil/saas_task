import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { User, UserProfile, UserUpdate, UserAvatarUpdate } from '../models/user.model';

/**
 * User service for managing user profiles
 */
@Injectable({
    providedIn: 'root'
})
export class UserService {
    constructor(private apiService: ApiService) { }

    /**
     * Get current user profile
     *
     * @returns Observable<UserProfile> Current user data
     */
    getCurrentUser(): Observable<UserProfile> {
        return this.apiService.get<UserProfile>('users/me');
    }

    /**
     * Update current user profile
     *
     * @param data Profile update data
     * @returns Observable<UserProfile> Updated user data
     */
    updateProfile(data: UserUpdate): Observable<UserProfile> {
        return this.apiService.patch<UserProfile>('users/me', data);
    }

    /**
     * Update user avatar
     *
     * @param data Avatar update data with file
     * @returns Observable<UserProfile> Updated user data with new avatar URL
     */
    updateAvatar(data: UserAvatarUpdate): Observable<UserProfile> {
        return this.apiService.upload<UserProfile>('users/me/avatar', data.avatar!);
    }

    /**
     * Remove user avatar
     *
     * @returns Observable<UserProfile> Updated user data without avatar
     */
    removeAvatar(): Observable<UserProfile> {
        return this.apiService.delete<UserProfile>('users/me/avatar');
    }
}