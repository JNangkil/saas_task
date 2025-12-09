import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseCellRendererComponent } from './base-cell-renderer.component';

/**
 * Status cell renderer component
 * Handles status and priority column types with colored indicators
 */
@Component({
    selector: 'app-status-cell-renderer',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div [ngClass]="getCellClasses()" (click)="startEditing()">
            <div [ngClass]="getContentClasses()">
                <ng-container *ngIf="!isEditing">
                    <span *ngIf="value && getStatusOption(value)" 
                          class="status-badge" 
                          [style.background-color]="getStatusOption(value)?.color">
                        {{ getStatusOption(value)?.label }}
                    </span>
                    <span *ngIf="!value || !getStatusOption(value)" class="empty-placeholder">—</span>
                </ng-container>
                
                <ng-container *ngIf="isEditing">
                    <select #statusSelect
                            class="form-control status-select"
                            [value]="value || ''"
                            [disabled]="readonly"
                            (keydown)="onKeyDown($event)"
                            (blur)="stopEditing()"
                            (change)="onStatusChange($event)"
                            autofocus>
                        <option value="" *ngIf="!column?.is_required">—</option>
                        <option *ngFor="let option of getStatusOptions()" 
                                [value]="option.value"
                                [selected]="value === option.value">
                            {{ option.label }}
                        </option>
                    </select>
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
        
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            color: white;
            text-align: center;
            min-width: 60px;
        }
        
        .empty-placeholder {
            color: #9ca3af;
            font-style: italic;
        }
        
        .status-select {
            width: 100%;
            padding: 2px 4px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 12px;
            line-height: 1.4;
        }
        
        .status-select:focus {
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
export class StatusCellRendererComponent extends BaseCellRendererComponent {

    /**
     * Get status options from column configuration
     */
    getStatusOptions() {
        return this.column?.options?.status_options || [];
    }

    /**
     * Get status option by value
     */
    getStatusOption(value: string) {
        const options = this.getStatusOptions();
        return options.find(option => option.value === value);
    }

    /**
     * Handle status change
     */
    onStatusChange(event: Event): void {
        const select = event.target as HTMLSelectElement;
        this.value = select.value || null;
    }

    /**
     * Format the value for display
     */
    override formatDisplayValue(value: any): string {
        if (!value) {
            return '';
        }

        const option = this.getStatusOption(value);
        return option ? option.label : String(value);
    }

    /**
     * Validate the value
     */
    override validateValue(value: any): boolean {
        if (!value) {
            return !this.column?.is_required;
        }

        const option = this.getStatusOption(value);
        return !!option;
    }

    /**
     * Get CSS classes for the cell
     */
    override getCellClasses(): string[] {
        const classes = super.getCellClasses();

        if (this.column?.type === 'priority') {
            classes.push('cell-priority');
        } else {
            classes.push('cell-status');
        }

        return classes;
    }

    /**
     * Get CSS classes for the cell content
     */
    override getContentClasses(): string[] {
        const classes = super.getContentClasses();

        if (this.column?.type === 'priority') {
            classes.push('content-priority');
        } else {
            classes.push('content-status');
        }

        return classes;
    }
}