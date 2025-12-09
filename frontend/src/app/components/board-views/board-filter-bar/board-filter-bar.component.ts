import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { TaskFilters, User, Label } from '../../../models';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil, distinctUntilChanged } from 'rxjs/operators';

@Component({
    selector: 'app-board-filter-bar',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './board-filter-bar.component.html',
    styleUrls: ['./board-filter-bar.component.scss']
})
export class BoardFilterBarComponent implements OnInit, OnDestroy {
    @Input() filters: TaskFilters = {};
    @Input() members: User[] = [];
    @Input() labels: Label[] = [];
    @Input() statuses: string[] = ['todo', 'in_progress', 'review', 'done'];
    @Input() priorities: string[] = ['low', 'medium', 'high', 'urgent'];

    @Output() filtersChange = new EventEmitter<TaskFilters>();

    searchControl = new FormControl('');
    showFilters = false;

    private destroy$ = new Subject<void>();

    ngOnInit() {
        // Initialize search control with current value
        if (this.filters.search) {
            this.searchControl.setValue(this.filters.search);
        }

        // Debounce search input
        this.searchControl.valueChanges.pipe(
            takeUntil(this.destroy$),
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(value => {
            this.updateFilter('search', value || undefined);
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    toggleFilters() {
        this.showFilters = !this.showFilters;
    }

    updateFilter(key: keyof TaskFilters, value: any) {
        const newFilters = { ...this.filters, [key]: value };

        // cleanup undefined/empty values
        if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
            delete newFilters[key];
        }

        this.filters = newFilters;
        this.filtersChange.emit(this.filters);
    }

    // Helper handling array toggles (for multi-select)
    toggleArrayFilter(key: 'status' | 'priority', value: string) {
        const current = this.filters[key] || [];
        const newArray = current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value];

        this.updateFilter(key, newArray.length ? newArray : undefined);
    }

    toggleIdArrayFilter(key: 'assignee_id' | 'labels', id: number) {
        const current = this.filters[key] || [];
        const newArray = current.includes(id)
            ? current.filter(v => v !== id)
            : [...current, id];

        this.updateFilter(key, newArray.length ? newArray : undefined);
    }

    clearFilters() {
        this.filters = {};
        this.searchControl.setValue('');
        this.filtersChange.emit(this.filters);
    }

    hasActiveFilters(): boolean {
        return Object.keys(this.filters).length > 0;
    }

    getActiveCount(): number {
        return Object.keys(this.filters).filter(k => k !== 'search').length;
    }

    isFilterActive(key: 'status' | 'priority', value: string): boolean {
        return (this.filters[key] || []).includes(value);
    }

    isIdFilterActive(key: 'assignee_id' | 'labels', id: number): boolean {
        return (this.filters[key] || []).includes(id);
    }
}
