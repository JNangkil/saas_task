import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { TextCellRendererComponent } from './text-cell-renderer.component';
import { BoardColumn, TaskFieldValue } from '../../models';

describe('TextCellRendererComponent', () => {
    let component: TextCellRendererComponent;
    let fixture: ComponentFixture<TextCellRendererComponent>;
    let de: DebugElement;

    const mockColumn: BoardColumn = {
        id: 1,
        board_id: 1,
        name: 'Title',
        type: 'text',
        position: 1,
        width: 200,
        is_pinned: false,
        is_required: false,
        options: {
            placeholder: 'Enter title...',
            max_length: 100
        },
        created_at: '2023-12-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
    };

    const mockFieldValue: TaskFieldValue = {
        id: 1,
        task_id: 1,
        board_column_id: 1,
        value: 'Test task title',
        created_at: '2023-12-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TextCellRendererComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(TextCellRendererComponent);
        component = fixture.componentInstance;
        de = fixture.debugElement;

        component.column = mockColumn;
        component.fieldValue = mockFieldValue;
        component.taskId = 1;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display the field value', () => {
        const textValue = de.query(By.css('.text-value'));
        expect(textValue.nativeElement.textContent).toContain('Test task title');
    });

    it('should show empty placeholder for null/undefined/empty values', () => {
        component.fieldValue = { ...mockFieldValue, value: '' };
        fixture.detectChanges();

        const placeholder = de.query(By.css('.empty-placeholder'));
        expect(placeholder).toBeTruthy();
        expect(placeholder.nativeElement.textContent).toBe('—');
    });

    it('should show empty placeholder for null value', () => {
        component.fieldValue = { ...mockFieldValue, value: null };
        fixture.detectChanges();

        const placeholder = de.query(By.css('.empty-placeholder'));
        expect(placeholder).toBeTruthy();
    });

    it('should start editing on click when not readonly', () => {
        spyOn(component.editStart, 'emit');

        const cellRenderer = de.query(By.css('.cell-renderer'));
        cellRenderer.nativeElement.click();

        expect(component.isEditing).toBe(true);
        expect(component.editStart.emit).toHaveBeenCalled();
    });

    it('should not start editing when readonly', () => {
        component.readonly = true;
        fixture.detectChanges();

        spyOn(component.editStart, 'emit');

        const cellRenderer = de.query(By.css('.cell-renderer'));
        cellRenderer.nativeElement.click();

        expect(component.isEditing).toBe(false);
        expect(component.editStart.emit).not.toHaveBeenCalled();
    });

    it('should show input field when editing', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.text-input'));
        expect(input).toBeTruthy();
        expect(input.nativeElement.value).toBe('Test task title');
    });

    it('should apply placeholder from column options', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.text-input'));
        expect(input.nativeElement.placeholder).toBe('Enter title...');
    });

    it('should apply maxlength from column options', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.text-input'));
        expect(input.nativeElement.maxLength).toBe(100);
    });

    it('should apply default maxlength when not specified in options', () => {
        component.column = { ...mockColumn, options: {} };
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.text-input'));
        expect(input.nativeElement.maxLength).toBe(255);
    });

    it('should emit valueChange on input', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.valueChange, 'emit');

        const input = de.query(By.css('.text-input'));
        input.nativeElement.value = 'New value';
        input.dispatchEvent(new Event('input'));

        expect(component.valueChange.emit).toHaveBeenCalledWith('New value');
        expect(component.fieldValue.value).toBe('New value');
    });

    it('should stop editing on Enter key', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const input = de.query(By.css('.text-input'));
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        input.nativeElement.dispatchEvent(event);

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should cancel editing on Escape key', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const input = de.query(By.css('.text-input'));
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        input.nativeElement.dispatchEvent(event);

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should stop editing on blur', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const input = de.query(By.css('.text-input'));
        input.nativeElement.dispatchEvent(new Event('blur'));

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should format display value correctly', () => {
        expect(component.formatDisplayValue('test')).toBe('test');
        expect(component.formatDisplayValue(123)).toBe('123');
        expect(component.formatDisplayValue(null)).toBe('');
        expect(component.formatDisplayValue(undefined)).toBe('');
        expect(component.formatDisplayValue('')).toBe('');
    });

    it('should validate value based on max length', () => {
        expect(component.validateValue('short')).toBe(true);

        const longValue = 'a'.repeat(150);
        expect(component.validateValue(longValue)).toBe(false);
    });

    it('should validate required fields', () => {
        component.column = { ...mockColumn, is_required: true };

        expect(component.validateValue('value')).toBe(true);
        expect(component.validateValue('')).toBe(false);
        expect(component.validateValue(null)).toBe(false);
        expect(component.validateValue(undefined)).toBe(false);
    });

    it('should validate optional fields', () => {
        expect(component.validateValue('value')).toBe(true);
        expect(component.validateValue('')).toBe(true);
        expect(component.validateValue(null)).toBe(true);
        expect(component.validateValue(undefined)).toBe(true);
    });

    it('should add CSS classes based on column type', () => {
        component.column = { ...mockColumn, type: 'long_text' };
        fixture.detectChanges();

        const classes = component.getCellClasses();
        expect(classes).toContain('cell-long-text');

        const contentClasses = component.getContentClasses();
        expect(contentClasses).toContain('content-long-text');
    });

    it('should add default CSS classes for text type', () => {
        const classes = component.getCellClasses();
        expect(classes).toContain('cell-renderer');

        const contentClasses = component.getContentClasses();
        expect(contentClasses).toContain('content-text');
    });

    it('should add cell-empty class when value is empty', () => {
        component.fieldValue = { ...mockFieldValue, value: '' };
        fixture.detectChanges();

        const contentClasses = component.getContentClasses();
        expect(contentClasses).toContain('cell-empty');
    });

    it('should show required indicator', () => {
        component.column = { ...mockColumn, is_required: true };
        fixture.detectChanges();

        const classes = component.getCellClasses();
        expect(classes).toContain('cell-required');
    });

    it('should add readonly class when readonly', () => {
        component.readonly = true;
        fixture.detectChanges();

        const classes = component.getCellClasses();
        expect(classes).toContain('cell-readonly');
    });

    it('should add editing class when editing', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const classes = component.getCellClasses();
        expect(classes).toContain('cell-editing');
    });

    it('should handle null fieldValue', () => {
        component.fieldValue = null as any;
        fixture.detectChanges();

        expect(component.value).toBeUndefined();
        expect(component.formatDisplayValue(null)).toBe('');
    });

    it('should set value correctly when fieldValue exists', () => {
        expect(component.value).toBe('Test task title');

        component.value = 'New test value';
        expect(component.fieldValue.value).toBe('New test value');
    });

    it('should handle value change without fieldValue', () => {
        component.fieldValue = null as any;

        // Should not throw error
        component.value = 'test';
        expect(component.fieldValue).toBeNull();
    });
});