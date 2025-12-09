import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { User } from '../../models/user.model';
import { ApiService } from '../../services/api.service';
import { WorkspaceMemberService } from '../../services/workspace-member.service';

interface WatcherUser extends User {
    isWatching?: boolean;
    isCurrent?: boolean;
}

@Component({
    selector: 'app-task-watchers',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './task-watchers.component.html',
    styleUrls: ['./task-watchers.component.scss']
})
export class TaskWatchersComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    @Input() taskId: number | null = null;
    @Input() workspaceId: number | null = null;
    @Input() disabled = false;
    @Input() compact = false;

    @Output() watchersChange = new EventEmitter<User[]>();

    isOpen = false;
    searchQuery = '';
    isLoading = false;
    watchers: WatcherUser[] = [];
    availableUsers: WatcherUser[] = [];
    filteredAvailableUsers: WatcherUser[] = [];

    constructor(
        private apiService: ApiService,
        private workspaceMemberService: WorkspaceMemberService
    ) {
        // Set up search debouncing
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(query => {
                this.isLoading = true;
                return this.loadWorkspaceUsers(query);
            }),
            takeUntil(this.destroy$)
        ).subscribe({
            next: (users) => {
                this.filteredAvailableUsers = users;
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
            }
        });
    }

    ngOnInit(): void {
        if (this.taskId) {
            this.loadWatchers();
        }
        if (this.workspaceId) {
            this.loadAvailableUsers();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load current task watchers
     */
    private loadWatchers(): void {
        if (!this.taskId) {
            return;
        }

        this.apiService.get<any>(`tasks/${this.taskId}/watchers`)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.watchers = response.data.map(watcher => ({
                        ...watcher,
                        isWatching: true,
                        isCurrent: watcher.isCurrent || false
                    }));
                    this.watchersChange.emit(this.watchers);
                    this.updateAvailableUsers();
                },
                error: () => {
                    // Handle error
                }
            });
    }

    /**
     * Load available workspace users
     */
    private loadAvailableUsers(): void {
        if (!this.workspaceId) {
            return;
        }

        this.isLoading = true;
        this.loadWorkspaceUsers('').pipe(takeUntil(this.destroy$)).subscribe({
            next: (users) => {
                this.availableUsers = users;
                this.filteredAvailableUsers = users;
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
            }
        });
    }

    /**
     * Load workspace users
     */
    private loadWorkspaceUsers(query: string) {
        if (!this.workspaceId) {
            return of([]);
        }

        return this.workspaceMemberService.getMembers(this.workspaceId).pipe(
            map(response => {
                let users = response.data.map(member => ({
                    id: member.user.id,
                    name: member.user.name,
                    email: member.user.email,
                    avatar_url: member.user.avatar_url,
                    job_title: member.user.job_title,
                    status: member.user.status,
                    created_at: member.user.created_at,
                    updated_at: member.user.updated_at,
                    isCurrent: member.current_user || false
                } as WatcherUser));

                // Filter out existing watchers
                users = users.filter(user => !this.watchers.some(watcher => watcher.id === user.id));

                // Filter by search query if provided
                if (query) {
                    const lowerQuery = query.toLowerCase();
                    users = users.filter(user =>
                        user.name.toLowerCase().includes(lowerQuery) ||
                        user.email.toLowerCase().includes(lowerQuery) ||
                        (user.job_title && user.job_title.toLowerCase().includes(lowerQuery))
                    );
                }

                return users;
            })
        );
    }

    /**
     * Update available users list
     */
    private updateAvailableUsers(): void {
        this.availableUsers = this.availableUsers.filter(user =>
            !this.watchers.some(watcher => watcher.id === user.id)
        );
        this.filteredAvailableUsers = [...this.availableUsers];
    }

    /**
     * Toggle dropdown
     */
    toggleDropdown(): void {
        if (this.disabled) {
            return;
        }

        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.searchQuery = '';
            this.filteredAvailableUsers = [...this.availableUsers];
            setTimeout(() => {
                const searchInput = document.getElementById('watcher-search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }, 0);
        }
    }

    /**
     * Close dropdown
     */
    closeDropdown(): void {
        this.isOpen = false;
        this.searchQuery = '';
    }

    /**
     * Handle search input
     */
    onSearchChange(): void {
        this.searchSubject.next(this.searchQuery);
    }

    /**
     * Add watcher
     */
    addWatcher(user: WatcherUser): void {
        if (this.disabled || !this.taskId) {
            return;
        }

        this.apiService.post(`tasks/${this.taskId}/watchers`, { user_id: user.id })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    const updatedUser = { ...user, isWatching: true };
                    this.watchers.push(updatedUser);
                    this.watchersChange.emit([...this.watchers]);
                    this.updateAvailableUsers();
                },
                error: () => {
                    // Handle error
                }
            });
    }

    /**
     * Remove watcher
     */
    removeWatcher(user: WatcherUser): void {
        if (this.disabled || !this.taskId) {
            return;
        }

        this.apiService.delete(`tasks/${this.taskId}/watchers/${user.id}`)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.watchers = this.watchers.filter(w => w.id !== user.id);
                    this.watchersChange.emit([...this.watchers]);

                    // Add back to available users
                    const availableUser = { ...user, isWatching: false };
                    this.availableUsers.push(availableUser);
                    this.filteredAvailableUsers = [...this.availableUsers];
                },
                error: () => {
                    // Handle error
                }
            });
    }

    /**
     * Handle click outside
     */
    onDocumentClick(event: Event): void {
        const target = event.target as Element;
        if (!this.isOpen || target.closest('.task-watchers')) {
            return;
        }
        this.closeDropdown();
    }

    /**
     * Get avatar URL or default
     */
    getAvatarUrl(user: WatcherUser): string {
        return user.avatar_url || 'assets/images/default-avatar.png';
    }

    /**
     * Track by user ID for ngFor
     */
    trackByUserId(index: number, user: WatcherUser): number {
        return user.id;
    }

    /**
     * Get display text for compact mode
     */
    get watchersDisplayText(): string {
        if (this.watchers.length === 0) {
            return 'Add watchers';
        }
        if (this.compact && this.watchers.length > 2) {
            return `${this.watchers[0].name} +${this.watchers.length - 1}`;
        }
        return this.watchers.map(w => w.name).join(', ');
    }
}