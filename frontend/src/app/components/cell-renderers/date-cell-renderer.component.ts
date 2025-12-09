import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseCellRendererComponent } from './base-cell-renderer.component';

/**
 * Date cell renderer component
 * Handles date and datetime column types
 */
@Component({
    selector: 'app-date-cell-renderer',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div [ngClass]="getCellClasses()" (click)="startEditing()">
            <div [ngClass]="getContentClasses()">
                <ng-container *ngIf="!isEditing">
                    <span *ngIf="value" class="date-value">{{ formatDisplayValue(value) }}</span>
                    <span *ngIf="!value" class="empty-placeholder">—</span>
                </ng-container>
                
                <ng-container *ngIf="isEditing">
                    <input 
                        #dateInput
                        [type]="column.type === 'datetime' ? 'datetime-local' : 'date'"
                        class="form-control date-input"
                        [value]="formatInputValue(value)"
                        [disabled]="readonly"
                        (keydown)="onKeyDown($event)"
                        (blur)="stopEditing()"
                        (input)="onDateChange($event)"
                        autofocus>
                </ng-container>
            </div>
        </div>
    `,
    styles: [`
        .cell-renderer {
            width: 100%;
            height: 100%;
            min-height: 32px;
            padding: 4px 8px;
            cursor: pointer;
            position: relative;
            display: flex;
            align-items: center;
        }
        
        .cell-renderer.cell-readonly {
            cursor: default;
        }
        
        .cell-content {
            width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .cell-content.cell-empty {
            color: #9ca3af;
        }
        
        .date-value {
            display: block;
            font-size: 14px;
        }
        
        .empty-placeholder {
            color: #9ca3af;
            font-style: italic;
        }
        
        .date-input {
            width: 100%;
            padding: 2px 4px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .date-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 1px #3b82f6;
        }
        
        .cell-editing {
            background-color: #f9fafb;
            padding: 2px 4px;
        }
        
        .cell-required::after {
            content: '*';
            color: #ef4444;
            margin-left: 4px;
        }
    `]
})
export class DateCellRendererComponent extends BaseCellRendererComponent {

    /**
     * Handle date change
     */
    onDateChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.value = input.value ? this.parseDateValue(input.value) : null;
    }

    /**
     * Format value for input field
     */
    formatInputValue(value: any): string {
        if (!value) {
            return '';
        }

        const date = new Date(value);

        if (this.column?.type === 'datetime') {
            // Format as YYYY-MM-DDTHH:MM for datetime-local input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');

            return `${year}-${month}-${day}T${hours}:${minutes}`;
        } else {
            // Format as YYYY-MM-DD for date input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        }
    }

    /**
     * Parse date value from input
     */
    parseDateValue(value: string): string | null {
        if (!value) {
            return null;
        }

        if (this.column?.type === 'datetime') {
            // Parse datetime-local value
            const date = new Date(value);
            return date.toISOString();
        } else {
            // Parse date value
            const date = new Date(value + 'T00:00:00');
            return date.toISOString().split('T')[0];
        }
    }

    /**
     * Format the value for display
     */
    override formatDisplayValue(value: any): string {
        if (!value) {
            return '';
        }

        try {
            const date = new Date(value);

            if (this.column?.type === 'datetime') {
                return date.toLocaleString();
            } else {
                return date.toLocaleDateString();
            }
        } catch (error) {
            return String(value);
        }
    }

    /**
     * Validate the value
     */
    override validateValue(value: any): boolean {
        if (!value) {
            return !this.column?.is_required;
        }

        try {
            const date = new Date(value);
            return !isNaN(date.getTime());
        } catch (error) {
            return false;
        }
    }

    /**
     * Get CSS classes for the cell
     */
    override getCellClasses(): string[] {
        const classes = super.getCellClasses();

        if (this.column?.type === 'datetime') {
            classes.push('cell-datetime');
        } else {
            classes.push('cell-date');
        }

        return classes;
    }

    /**
     * Get CSS classes for the cell content
     */
    override getContentClasses(): string[] {
        const classes = super.getContentClasses();

        if (this.column?.type === 'datetime') {
            classes.push('content-datetime');
        } else {
            classes.push('content-date');
        }

        return classes;
    }
}