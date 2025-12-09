import { Component } from '@angular/core';
import { BaseCellRendererComponent } from './base-cell-renderer.component';

/**
 * Text cell renderer component
 * Handles text and long text column types
 */
@Component({
    selector: 'app-text-cell-renderer',
    template: `
        <div [ngClass]="getCellClasses()" (click)="startEditing()">
            <div [ngClass]="getContentClasses()">
                <ng-container *ngIf="!isEditing">
                    <span class="text-value">{{ formatDisplayValue(value) }}</span>
                    <span *ngIf="!value || value === ''" class="empty-placeholder">—</span>
                </ng-container>
                
                <ng-container *ngIf="isEditing">
                    <input 
                        #textInput
                        type="text"
                        class="form-control text-input"
                        [value]="value || ''"
                        [placeholder]="column?.options?.placeholder || ''"
                        [maxlength]="column?.options?.max_length || 255"
                        [disabled]="readonly"
                        (keydown)="onKeyDown($event)"
                        (blur)="stopEditing()"
                        (input)="onInputChange($event)"
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
        
        .text-value {
            display: block;
        }
        
        .empty-placeholder {
            color: #9ca3af;
            font-style: italic;
        }
        
        .text-input {
            width: 100%;
            padding: 2px 4px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .text-input:focus {
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
export class TextCellRendererComponent extends BaseCellRendererComponent {

    /**
     * Handle input change event
     */
    onInputChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.value = input.value;
    }

    /**
     * Format the value for display
     */
    override formatDisplayValue(value: any): string {
        if (value === null || value === undefined || value === '') {
            return '';
        }
        return String(value);
    }

    /**
     * Validate the value
     */
    override validateValue(value: any): boolean {
        if (value === null || value === undefined || value === '') {
            return !this.column?.is_required;
        }

        const stringValue = String(value);
        const maxLength = this.column?.options?.max_length || 255;

        return stringValue.length <= maxLength;
    }

    /**
     * Get CSS classes for the cell
     */
    override getCellClasses(): string[] {
        const classes = super.getCellClasses();

        if (this.column?.type === 'long_text') {
            classes.push('cell-long-text');
        }

        return classes;
    }

    /**
     * Get CSS classes for the cell content
     */
    override getContentClasses(): string[] {
        const classes = super.getContentClasses();

        if (this.column?.type === 'long_text') {
            classes.push('content-long-text');
        } else {
            classes.push('content-text');
        }

        return classes;
    }
}