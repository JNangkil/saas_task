import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { UserProfile, UserUpdate } from '../../models/user.model';

@Component({
    selector: 'app-profile-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './profile-page.component.html',
    styleUrls: ['./profile-page.component.scss']
})
export class ProfilePageComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    profileForm: FormGroup;
    avatarForm: FormGroup;
    isSaving = false;
    isUploadingAvatar = false;
    isRemovingAvatar = false;

    user: UserProfile | null = null;
    avatarPreview: string | null = null;

    // Common timezones
    timezones = [
        { value: 'UTC', label: 'UTC' },
        { value: 'America/New_York', label: 'Eastern Time (ET)' },
        { value: 'America/Chicago', label: 'Central Time (CT)' },
        { value: 'America/Denver', label: 'Mountain Time (MT)' },
        { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
        { value: 'Europe/London', label: 'London (GMT/BST)' },
        { value: 'Europe/Paris', label: 'Paris (CET)' },
        { value: 'Europe/Berlin', label: 'Berlin (CET)' },
        { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
        { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
        { value: 'Australia/Sydney', label: 'Sydney (AEST)' }
    ];

    // Common locales
    locales = [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' },
        { value: 'fr', label: 'Français' },
        { value: 'de', label: 'Deutsch' },
        { value: 'it', label: 'Italiano' },
        { value: 'pt', label: 'Português' },
        { value: 'ru', label: 'Русский' },
        { value: 'ja', label: '日本語' },
        { value: 'zh', label: '中文' }
    ];

    constructor(
        private userService: UserService,
        private toastService: ToastService,
        private fb: FormBuilder
    ) {
        this.profileForm = this.fb.group({
            name: ['', [Validators.required, Validators.maxLength(255)]],
            job_title: ['', Validators.maxLength(255)],
            timezone: ['UTC'],
            locale: ['en']
        });

        this.avatarForm = this.fb.group({
            avatar: [null]
        });
    }

    ngOnInit(): void {
        this.loadUserProfile();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load current user profile
     */
    loadUserProfile(): void {
        this.userService.getCurrentUser()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (user) => {
                    this.user = user;
                    this.avatarPreview = user.avatar_url || null;
                    this.profileForm.patchValue({
                        name: user.name,
                        job_title: user.job_title || '',
                        timezone: user.timezone || 'UTC',
                        locale: user.locale || 'en'
                    });
                },
                error: (error) => {
                    this.toastService.showError('Failed to load profile: ' + error.message);
                }
            });
    }

    /**
     * Save profile changes
     */
    saveProfile(): void {
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }

        this.isSaving = true;
        const updateData: UserUpdate = this.profileForm.value;

        this.userService.updateProfile(updateData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (updatedUser) => {
                    this.user = updatedUser;
                    this.toastService.showSuccess('Profile updated successfully');
                    this.isSaving = false;
                },
                error: (error) => {
                    this.toastService.showError('Failed to update profile: ' + error.message);
                    this.isSaving = false;
                }
            });
    }

    /**
     * Handle avatar file selection
     */
    onAvatarSelect(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];

        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.toastService.showError('Please select an image file');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.toastService.showError('Image size must be less than 5MB');
                return;
            }

            // Create preview
            const reader = new FileReader();
            reader.onload = () => {
                this.avatarPreview = reader.result as string;
            };
            reader.readAsDataURL(file);

            this.avatarForm.patchValue({ avatar: file });
        }
    }

    /**
     * Upload avatar
     */
    uploadAvatar(): void {
        const file = this.avatarForm.get('avatar')?.value;

        if (!file) {
            this.toastService.showError('Please select an image first');
            return;
        }

        this.isUploadingAvatar = true;

        this.userService.updateAvatar({ avatar: file })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (updatedUser) => {
                    this.user = updatedUser;
                    this.avatarPreview = updatedUser.avatar_url || null;
                    this.toastService.showSuccess('Avatar updated successfully');
                    this.isUploadingAvatar = false;
                    this.avatarForm.reset();
                },
                error: (error) => {
                    this.toastService.showError('Failed to update avatar: ' + error.message);
                    this.isUploadingAvatar = false;
                    // Reset preview to current avatar
                    this.avatarPreview = this.user?.avatar_url || null;
                }
            });
    }

    /**
     * Remove avatar
     */
    removeAvatar(): void {
        if (!this.user?.avatar_url) {
            return;
        }

        this.isRemovingAvatar = true;

        this.userService.removeAvatar()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (updatedUser) => {
                    this.user = updatedUser;
                    this.avatarPreview = null;
                    this.toastService.showSuccess('Avatar removed successfully');
                    this.isRemovingAvatar = false;
                    this.avatarForm.reset();
                },
                error: (error) => {
                    this.toastService.showError('Failed to remove avatar: ' + error.message);
                    this.isRemovingAvatar = false;
                }
            });
    }

    /**
     * Reset avatar preview
     */
    resetAvatarPreview(): void {
        this.avatarPreview = this.user?.avatar_url || null;
        this.avatarForm.reset();
        // Clear file input
        const fileInput = document.getElementById('avatar-input') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }

    /**
     * Get timezone label
     */
    getTimezoneLabel(timezone: string): string {
        const tz = this.timezones.find(t => t.value === timezone);
        return tz ? tz.label : timezone;
    }

    /**
     * Get locale label
     */
    getLocaleLabel(locale: string): string {
        const loc = this.locales.find(l => l.value === locale);
        return loc ? loc.label : locale;
    }

    /**
     * Format date
     */
    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleString();
    }
}