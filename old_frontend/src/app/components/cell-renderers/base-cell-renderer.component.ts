import { Component, Input, EventEmitter, Output } from '@angular/core';
import { BoardColumn, TaskFieldValue } from '../../models';

/**
 * Base class for cell renderer components
 * Provides common functionality and interface for all cell renderers
 */
@Component({
    template: ''
})
export abstract class BaseCellRendererComponent {
    /**
     * The column definition
     */
    @Input() column!: BoardColumn;

    /**
     * The field value for this cell
     */
    @Input() fieldValue!: TaskFieldValue;

    /**
     * The task ID
     */
    @Input() taskId!: number;

    /**
     * Whether the cell is in edit mode
     */
    @Input() isEditing: boolean = false;

    /**
     * Whether the cell is readonly
     */
    @Input() readonly: boolean = false;

    /**
     * Event emitted when value changes
     */
    @Output() valueChange = new EventEmitter<any>();

    /**
     * Event emitted when edit mode starts
     */
    @Output() editStart = new EventEmitter<void>();

    /**
     * Event emitted when edit mode ends
     */
    @Output() editEnd = new EventEmitter<void>();

    /**
     * Get the current value
     */
    get value(): any {
        return this.fieldValue?.value;
    }

    /**
     * Set the value and emit change event
     */
    set value(newValue: any) {
        if (this.fieldValue) {
            this.fieldValue.value = newValue;
        }
        this.valueChange.emit(newValue);
    }

    /**
     * Start editing the cell
     */
    startEditing(): void {
        if (!this.readonly && !this.isEditing) {
            this.isEditing = true;
            this.editStart.emit();
        }
    }

    /**
     * Stop editing the cell
     */
    stopEditing(): void {
        if (this.isEditing) {
            this.isEditing = false;
            this.editEnd.emit();
        }
    }

    /**
     * Cancel editing and revert to original value
     */
    cancelEditing(): void {
        if (this.isEditing) {
            this.isEditing = false;
            this.editEnd.emit();
        }
    }

    /**
     * Handle keydown events for editing
     */
    onKeyDown(event: KeyboardEvent): void {
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                this.stopEditing();
                break;
            case 'Escape':
                event.preventDefault();
                this.cancelEditing();
                break;
        }
    }

    /**
     * Format the value for display
     * Override in subclasses for specific formatting
     */
    formatDisplayValue(value: any): string {
        if (value === null || value === undefined || value === '') {
            return '';
        }
        return String(value);
    }

    /**
     * Validate the value
     * Override in subclasses for specific validation
     */
    validateValue(value: any): boolean {
        return true;
    }

    /**
     * Get CSS classes for the cell
     */
    getCellClasses(): string[] {
        const classes = ['cell-renderer'];

        if (this.isEditing) {
            classes.push('cell-editing');
        }

        if (this.readonly) {
            classes.push('cell-readonly');
        }

        if (this.column?.is_required) {
            classes.push('cell-required');
        }

        return classes;
    }

    /**
     * Get CSS classes for the cell content
     */
    getContentClasses(): string[] {
        const classes = ['cell-content'];

        if (!this.value || this.value === '') {
            classes.push('cell-empty');
        }

        return classes;
    }
}