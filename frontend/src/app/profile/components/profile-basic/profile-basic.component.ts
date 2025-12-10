import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { UserUpdate } from '../../../models/user.model';

@Component({
    selector: 'app-profile-basic',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './profile-basic.component.html',
    styleUrls: ['./profile-basic.component.scss']
})
export class ProfileBasicComponent {
    @Input() user: any = null;
    @Input() isLoading = false;
    @Output() profileUpdated = new EventEmitter<void>();

    profileForm: FormGroup;
    avatarForm: FormGroup;
    isSubmitting = false;
    isUploadingAvatar = false;
    isRemovingAvatar = false;
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
        private fb: FormBuilder,
        private userService: UserService,
        private toastService: ToastService
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

    /**
     * Initialize form with user data
     */
    ngOnChanges(): void {
        if (this.user) {
            this.avatarPreview = this.user.avatar_url || null;
            this.profileForm.patchValue({
                name: this.user.name || '',
                job_title: this.user.job_title || '',
                timezone: this.user.timezone || 'UTC',
                locale: this.user.locale || 'en'
            });
        }
    }

    /**
     * Handle avatar file selection
     */
    onAvatarSelect(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];

        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.toastService.error('Please select an image file');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.toastService.error('Image size must be less than 5MB');
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
     * Handle form submission
     */
    onSubmit(): void {
        if (this.profileForm.invalid) {
            this.profileForm.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;
        const updateData: UserUpdate = this.profileForm.value;

        this.userService.updateProfile(updateData).subscribe({
            next: (updatedUser) => {
                this.toastService.success('Profile updated successfully');
                this.isSubmitting = false;
                this.profileUpdated.emit();
            },
            error: (error) => {
                const message = error.error?.message || 'Failed to update profile';
                this.toastService.error(message);
                this.isSubmitting = false;
            }
        });
    }

    /**
     * Upload avatar
     */
    uploadAvatar(): void {
        const file = this.avatarForm.get('avatar')?.value;

        if (!file) {
            this.toastService.error('Please select an image first');
            return;
        }

        this.isUploadingAvatar = true;

        this.userService.updateAvatar({ avatar: file }).subscribe({
            next: (updatedUser) => {
                this.user = updatedUser;
                this.avatarPreview = updatedUser.avatar_url || null;
                this.toastService.success('Avatar updated successfully');
                this.isUploadingAvatar = false;
                this.avatarForm.reset();
                this.profileUpdated.emit();
            },
            error: (error) => {
                const message = error.error?.message || 'Failed to update avatar';
                this.toastService.error(message);
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

        this.userService.removeAvatar().subscribe({
            next: (updatedUser) => {
                this.user = updatedUser;
                this.avatarPreview = null;
                this.toastService.success('Avatar removed successfully');
                this.isRemovingAvatar = false;
                this.avatarForm.reset();
                this.profileUpdated.emit();
            },
            error: (error) => {
                const message = error.error?.message || 'Failed to remove avatar';
                this.toastService.error(message);
                this.isRemovingAvatar = false;
            }
        });
    }

    /**
     * Reset avatar preview
     */
    resetAvatarPreview(): void {
        this.avatarPreview = this.user?.avatar_url || null;
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

    /**
     * Get form field error message
     */
    getErrorMessage(field: string): string {
        const formControl = this.profileForm.get(field);

        if (!formControl || !formControl.errors || !formControl.touched) {
            return '';
        }

        const errors = formControl.errors;

        if (errors['required']) {
            return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        }

        if (errors['maxlength']) {
            return `${field.charAt(0).toUpperCase() + field.slice(1)} must be less than 255 characters`;
        }

        return 'Invalid input';
    }

    /**
     * Check if form field has error
     */
    hasError(field: string): boolean {
        const formControl = this.profileForm.get(field);
        return formControl ? formControl.invalid && formControl.touched : false;
    }
}