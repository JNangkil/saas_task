import { Component } from '@angular/core';
import { BaseCellRendererComponent } from './base-cell-renderer.component';

/**
 * Checkbox cell renderer component
 * Handles checkbox column types
 */
@Component({
    selector: 'app-checkbox-cell-renderer',
    template: `
        <div [ngClass]="getCellClasses()" (click)="toggleValue()">
            <div [ngClass]="getContentClasses()">
                <ng-container *ngIf="!isEditing">
                    <input 
                        type="checkbox"
                        class="checkbox-input"
                        [checked]="!!value"
                        [disabled]="readonly"
                        (click)="$event.stopPropagation()">
                </ng-container>
                
                <ng-container *ngIf="isEditing">
                    <input 
                        #checkboxInput
                        type="checkbox"
                        class="checkbox-input editing"
                        [checked]="!!value"
                        [disabled]="readonly"
                        (keydown)="onKeyDown($event)"
                        (blur)="stopEditing()"
                        (change)="onCheckboxChange($event)"
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
            justify-content: center;
        }
        
        .cell-renderer.cell-readonly {
            cursor: default;
        }
        
        .cell-content {
            width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            display: flex;
            justify-content: center;
        }
        
        .checkbox-input {
            width: 16px;
            height: 16px;
            margin: 0;
            cursor: pointer;
        }
        
        .checkbox-input.editing {
            transform: scale(1.2);
        }
        
        .checkbox-input:focus {
            outline: 2px solid #3b82f6;
            outline-offset: 2px;
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
export class CheckboxCellRendererComponent extends BaseCellRendererComponent {

    /**
     * Toggle the checkbox value
     */
    toggleValue(): void {
        if (!this.readonly && !this.isEditing) {
            this.value = !this.value;
            this.valueChange.emit(this.value);
        }
    }

    /**
     * Handle checkbox change
     */
    onCheckboxChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.value = input.checked;
    }

    /**
     * Format the value for display
     */
    override formatDisplayValue(value: any): string {
        return value ? 'Yes' : 'No';
    }

    /**
     * Validate the value
     */
    override validateValue(value: any): boolean {
        return typeof value === 'boolean';
    }

    /**
     * Get CSS classes for the cell
     */
    override getCellClasses(): string[] {
        const classes = super.getCellClasses();
        classes.push('cell-checkbox');
        return classes;
    }

    /**
     * Get CSS classes for the cell content
     */
    override getContentClasses(): string[] {
        const classes = super.getContentClasses();
        classes.push('content-checkbox');
        return classes;
    }
}