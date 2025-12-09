import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { User } from '../../models/user.model';
import { WorkspaceMemberService } from '../../services/workspace-member.service';

interface AssigneeUser extends User {
    isCurrent?: boolean;
}

@Component({
    selector: 'app-assignee-selector',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './assignee-selector.component.html',
    styleUrls: ['./assignee-selector.component.scss']
})
export class AssigneeSelectorComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private searchSubject = new Subject<string>();

    @Input() workspaceId: number | null = null;
    @Input() selectedUserId: number | null = null;
    @Input() disabled = false;
    @Input() placeholder = 'Select assignee';
    @Input() showUnassigned = true;
    @Input() size: 'sm' | 'md' | 'lg' = 'md';

    @Output() assigneeChange = new EventEmitter<number | null>();

    isOpen = false;
    searchQuery = '';
    isLoading = false;
    assignees: AssigneeUser[] = [];
    filteredAssignees: AssigneeUser[] = [];

    constructor(private workspaceMemberService: WorkspaceMemberService) {
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
                this.filteredAssignees = users;
                this.isLoading = false;
            },
            error: () => {
                this.isLoading = false;
            }
        });
    }

    ngOnInit(): void {
        if (this.workspaceId) {
            this.loadAssignees();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load assignees for the workspace
     */
    private loadAssignees(): void {
        this.isLoading = true;
        this.loadWorkspaceUsers('').pipe(takeUntil(this.destroy$)).subscribe({
            next: (users) => {
                this.assignees = users;
                this.filteredAssignees = users;
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
                    isCurrent: member.current_user
                } as AssigneeUser));

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
     * Toggle dropdown
     */
    toggleDropdown(): void {
        if (this.disabled) {
            return;
        }

        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.searchQuery = '';
            this.filteredAssignees = this.assignees;
            setTimeout(() => {
                const searchInput = document.getElementById('assignee-search-input');
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
     * Select assignee
     */
    selectAssignee(user: AssigneeUser | null): void {
        if (this.disabled) {
            return;
        }

        this.selectedUserId = user?.id || null;
        this.assigneeChange.emit(this.selectedUserId);
        this.closeDropdown();
    }

    /**
     * Clear selection
     */
    clearSelection(event?: MouseEvent): void {
        if (event) {
            event.stopPropagation();
        }

        if (this.disabled) {
            return;
        }

        this.selectAssignee(null);
    }

    /**
     * Get selected user display name
     */
    get selectedUser(): AssigneeUser | null {
        if (!this.selectedUserId) {
            return null;
        }
        return this.assignees.find(u => u.id === this.selectedUserId) || null;
    }

    /**
     * Handle click outside
     */
    onDocumentClick(event: Event): void {
        const target = event.target as Element;
        if (!this.isOpen || target.closest('.assignee-selector')) {
            return;
        }
        this.closeDropdown();
    }

    /**
     * Get CSS classes for the selector
     */
    get selectorClasses(): string[] {
        const classes = ['assignee-selector'];

        if (this.disabled) {
            classes.push('disabled');
        }

        if (this.isOpen) {
            classes.push('open');
        }

        switch (this.size) {
            case 'sm':
                classes.push('assignee-selector-sm');
                break;
            case 'lg':
                classes.push('assignee-selector-lg');
                break;
            default:
                classes.push('assignee-selector-md');
        }

        return classes;
    }

    /**
     * Get avatar URL or default
     */
    getAvatarUrl(user: AssigneeUser): string {
        return user.avatar_url || 'assets/images/default-avatar.png';
    }

    /**
     * Track by user ID for ngFor
     */
    trackByUserId(index: number, user: AssigneeUser): number {
        return user.id;
    }
}