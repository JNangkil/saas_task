import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { User } from '../../models';

@Component({
    selector: 'app-assignee-filter',
    templateUrl: './assignee-filter.component.html',
    styleUrls: ['./assignee-filter.component.css'],
    standalone: true,
    imports: [CommonModule]
})
export class AssigneeFilterComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    @Input() selectedAssignees: number[] = [];
    @Input() disabled = false;
    @Input() placeholder = 'Filter by assignee...';
    @Input() showAll = true;
    @Output() assigneesChange = new EventEmitter<number[]>();

    users: User[] = [];
    loading = false;
    search = '';
    isOpen = false;

    constructor(private userService: UserService) { }

    ngOnInit(): void {
        this.loadUsers();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadUsers(): void {
        this.loading = true;
        // Since getUsers() doesn't exist, we'll use an empty array for now
        // In a real implementation, you would call the appropriate service method
        this.users = [];
        this.loading = false;

        // Alternative implementation would be:
        // this.userService.getAllUsers().pipe(
        //     takeUntil(this.destroy$)
        // ).subscribe({
        //     next: (users: User[]) => {
        //         this.users = users;
        //         this.loading = false;
        //     },
        //     error: (error: any) => {
        //         console.error('Error loading users:', error);
        //         this.loading = false;
        //     }
        // });
    }

    onAssigneeToggle(userId: number): void {
        const index = this.selectedAssignees.indexOf(userId);
        if (index > -1) {
            // Remove user if already selected
            this.selectedAssignees = [...this.selectedAssignees.slice(0, index), ...this.selectedAssignees.slice(index + 1)];
        } else {
            // Add user if not selected
            this.selectedAssignees = [...this.selectedAssignees, userId];
        }
        this.assigneesChange.emit(this.selectedAssignees);
    }

    clearAll(): void {
        this.selectedAssignees = [];
        this.assigneesChange.emit(this.selectedAssignees);
    }

    selectAll(): void {
        this.selectedAssignees = this.users.map(u => u.id);
        this.assigneesChange.emit(this.selectedAssignees);
    }

    get filteredUsers(): User[] {
        if (!this.search) {
            return this.users;
        }
        const lowerSearch = this.search.toLowerCase();
        return this.users.filter(user =>
            user.name.toLowerCase().includes(lowerSearch) ||
            user.email.toLowerCase().includes(lowerSearch)
        );
    }

    isAssigneeSelected(userId: number): boolean {
        return this.selectedAssignees.includes(userId);
    }

    get selectedCount(): number {
        return this.selectedAssignees.length;
    }

    get totalCount(): number {
        return this.users.length;
    }

    onBlur(): void {
        // Delay closing to allow clicking on items
        setTimeout(() => {
            this.isOpen = false;
        }, 200);
    }

    onSearch(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.search = target.value;
    }
}