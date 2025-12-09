import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BoardColumn, ColumnType, ColumnTypeDefinition } from '../../models';
import { BoardColumnService } from '../../services/board-column.service';
import { ColumnTypeConfigurationService } from '../../services/column-type-configuration.service';

/**
 * Dialog data interface for column manager dialog
 */
export interface ColumnManagerDialogData {
    boardId: number;
    tenantId: number;
    workspaceId: number;
    column?: BoardColumn; // For edit mode
    mode: 'create' | 'edit';
}

/**
 * Dialog result interface
 */
export interface ColumnManagerDialogResult {
    column?: BoardColumn;
    action: 'created' | 'updated' | 'deleted';
}

/**
 * Column manager dialog component
 * Handles creating and editing board columns
 */
@Component({
    selector: 'app-column-manager-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    template: `
        <div class="dialog-container">
            <h2 class="dialog-title">
                {{ data?.mode === 'create' ? 'Add Column' : 'Edit Column' }}
            </h2>
            
            <form [formGroup]="columnForm" (ngSubmit)="onSubmit()">
                <div class="dialog-content">
                    <div class="form-row">
                        <div class="form-field">
                            <label for="name">Column Name</label>
                            <input 
                                id="name"
                                type="text" 
                                formControlName="name" 
                                placeholder="Enter column name"
                                required>
                            <div class="error-message" *ngIf="columnForm.get('name')?.hasError('required')">
                                Column name is required
                            </div>
                            <div class="error-message" *ngIf="columnForm.get('name')?.hasError('maxlength')">
                                Column name is too long
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-field">
                            <label for="type">Column Type</label>
                            <select formControlName="type" (change)="onTypeChange($any($event).target?.value)">
                                <option *ngFor="let type of columnTypes" [value]="type.type">
                                    {{ type.label }}
                                </option>
                            </select>
                            <div class="error-message" *ngIf="columnForm.get('type')?.hasError('required')">
                                Column type is required
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-field">
                            <label for="position">Position</label>
                            <input 
                                id="position"
                                type="number" 
                                formControlName="position" 
                                placeholder="Position"
                                min="1">
                            <div class="error-message" *ngIf="columnForm.get('position')?.hasError('required')">
                                Position is required
                            </div>
                            <div class="error-message" *ngIf="columnForm.get('position')?.hasError('min')">
                                Position must be at least 1
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-field">
                            <label for="width">Width (px)</label>
                            <input 
                                id="width"
                                type="number" 
                                formControlName="width" 
                                placeholder="Column width"
                                min="50">
                        </div>
                        
                        <div class="checkbox-field">
                            <input type="checkbox" formControlName="is_pinned" id="is_pinned">
                            <label for="is_pinned">Pin column</label>
                        </div>
                        
                        <div class="checkbox-field">
                            <input type="checkbox" formControlName="is_required" id="is_required">
                            <label for="is_required">Required field</label>
                        </div>
                    </div>
                    
                    <!-- Type-specific options -->
                    <div class="type-options" *ngIf="selectedTypeDefinition">
                        <h3>Type Options</h3>
                        <div class="options-container">
                            <!-- Text/Long Text Options -->
                            <div *ngIf="selectedTypeDefinition.type === 'text' || selectedTypeDefinition.type === 'long_text'">
                                <div class="form-field">
                                    <label for="placeholder">Placeholder</label>
                                    <input 
                                        id="placeholder"
                                        formControlName="placeholder"
                                        placeholder="Enter placeholder text">
                                </div>
                                
                                <div class="form-field" *ngIf="selectedTypeDefinition.type === 'text'">
                                    <label for="max_length">Max Length</label>
                                    <input 
                                        id="max_length"
                                        type="number"
                                        formControlName="max_length"
                                        placeholder="255">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="dialog-actions">
                    <button type="button" class="btn btn-secondary" (click)="onCancel()">
                        Cancel
                    </button>
                    <button type="submit" class="btn btn-primary" [disabled]="!columnForm.valid || isSubmitting">
                        {{ data?.mode === 'create' ? 'Create' : 'Update' }}
                    </button>
                </div>
            </form>
        </div>
    `,
    styles: [`
        .dialog-container {
            padding: 20px;
            min-width: 500px;
            max-width: 800px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .dialog-title {
            margin: 0 0 20px 0;
            font-size: 20px;
            font-weight: 600;
        }
        
        .dialog-content {
            margin-bottom: 20px;
        }
        
        .form-row {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
        }
        
        .form-field {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        .form-field label {
            margin-bottom: 4px;
            font-weight: 500;
            font-size: 14px;
        }
        
        .form-field input, .form-field select {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .form-field input:focus, .form-field select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 1px #3b82f6;
        }
        
        .checkbox-field {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 8px 0;
        }
        
        .checkbox-field input[type="checkbox"] {
            width: 16px;
            height: 16px;
        }
        
        .error-message {
            color: #ef4444;
            font-size: 12px;
            margin-top: 4px;
        }
        
        .type-options {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
        }
        
        .type-options h3 {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .options-container {
            margin-top: 16px;
        }
        
        .dialog-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .btn-secondary {
            background: #f3f4f6;
            color: #374151;
        }
        
        .btn-secondary:hover:not(:disabled) {
            background: #e5e7eb;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
            background: #2563eb;
        }
    `]
})
export class ColumnManagerDialogComponent implements OnInit {
    @Input() isVisible = false;
    @Input() data: ColumnManagerDialogData | null = null;
    @Input() isLoading = false;

    @Output() close = new EventEmitter<ColumnManagerDialogResult | void>();
    @Output() cancel = new EventEmitter<void>();

    columnForm!: FormGroup;
    columnTypes: ColumnTypeDefinition[] = [];
    selectedTypeDefinition: ColumnTypeDefinition | null = null;
    isSubmitting = false;

    constructor(
        private fb: FormBuilder,
        private boardColumnService: BoardColumnService,
        private columnTypeConfig: ColumnTypeConfigurationService
    ) { }

    ngOnInit(): void {
        if (this.data) {
            this.loadColumnTypes();
            this.initializeForm();
        }
    }

    /**
     * Load available column types
     */
    loadColumnTypes(): void {
        this.columnTypeConfig.getColumnTypes().subscribe(types => {
            this.columnTypes = types;
        });
    }

    /**
     * Initialize the form
     */
    initializeForm(): void {
        if (!this.data) return;

        const defaultOptions = this.data.column?.options || {};

        this.columnForm = this.fb.group({
            name: [this.data.column?.name || '', [Validators.required, Validators.maxLength(255)]],
            type: [this.data.column?.type || 'text', Validators.required],
            position: [this.data.column?.position || 1, [Validators.required, Validators.min(1)]],
            width: [this.data.column?.width || 150],
            is_pinned: [this.data.column?.is_pinned || false],
            is_required: [this.data.column?.is_required || false],

            // Type-specific options
            placeholder: [defaultOptions.placeholder || ''],
            max_length: [defaultOptions.max_length || 255]
        });

        // Set selected type definition
        if (this.data.column?.type) {
            this.onTypeChange(this.data.column.type);
        }
    }

    /**
     * Handle column type change
     */
    onTypeChange(type: ColumnType): void {
        this.selectedTypeDefinition = this.columnTypeConfig.getColumnTypeDefinition(type);

        // Set default options for the new type
        const defaultOptions = this.columnTypeConfig.getDefaultOptions(type);
        this.columnForm.patchValue({
            placeholder: defaultOptions.placeholder || '',
            max_length: defaultOptions.max_length
        });
    }

    /**
     * Handle form submission
     */
    onSubmit(): void {
        if (!this.columnForm.valid || !this.data) {
            return;
        }

        this.isSubmitting = true;
        const formValue = this.columnForm.value;

        // Prepare column data
        const columnData: Partial<BoardColumn> = {
            name: formValue.name,
            type: formValue.type,
            position: formValue.position,
            width: formValue.width,
            is_pinned: formValue.is_pinned,
            is_required: formValue.is_required,
            options: this.buildColumnOptions(formValue)
        };

        const operation = this.data.mode === 'create'
            ? this.boardColumnService.createBoardColumn(
                this.data.tenantId,
                this.data.workspaceId,
                this.data.boardId,
                columnData
            )
            : this.boardColumnService.updateBoardColumn(
                this.data.tenantId,
                this.data.workspaceId,
                this.data.boardId,
                this.data.column!.id,
                columnData
            );

        operation.subscribe({
            next: (column) => {
                this.close.emit({
                    column,
                    action: this.data?.mode === 'create' ? 'created' : 'updated'
                });
            },
            error: (error) => {
                console.error('Error saving column:', error);
                this.isSubmitting = false;
                // Handle error (show toast, etc.)
            },
            complete: () => {
                this.isSubmitting = false;
            }
        });
    }

    /**
     * Build column options object based on type
     */
    buildColumnOptions(formValue: any): any {
        const type = formValue.type;
        const options: any = {};

        switch (type) {
            case 'text':
            case 'long_text':
                options.placeholder = formValue.placeholder;
                options.max_length = formValue.max_length;
                break;
        }

        return options;
    }

    /**
     * Handle cancel
     */
    onCancel(): void {
        this.cancel.emit();
    }
}