import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { DateCellRendererComponent } from './date-cell-renderer.component';
import { BoardColumn, TaskFieldValue } from '../../models';

describe('DateCellRendererComponent', () => {
    let component: DateCellRendererComponent;
    let fixture: ComponentFixture<DateCellRendererComponent>;
    let de: DebugElement;

    const mockDateColumn: BoardColumn = {
        id: 1,
        board_id: 1,
        name: 'Due Date',
        type: 'date',
        position: 1,
        width: 150,
        is_pinned: false,
        is_required: false,
        options: {},
        created_at: '2023-12-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
    };

    const mockDateTimeColumn: BoardColumn = {
        ...mockDateColumn,
        name: 'Created At',
        type: 'datetime'
    };

    const mockFieldValue: TaskFieldValue = {
        id: 1,
        task_id: 1,
        board_column_id: 1,
        value: '2023-12-15T00:00:00Z',
        created_at: '2023-12-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DateCellRendererComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(DateCellRendererComponent);
        component = fixture.componentInstance;
        de = fixture.debugElement;

        component.column = mockDateColumn;
        component.fieldValue = mockFieldValue;
        component.taskId = 1;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display formatted date', () => {
        const dateValue = de.query(By.css('.date-value'));
        expect(dateValue).toBeTruthy();
        // The exact format depends on locale, but should not be empty
        expect(dateValue.nativeElement.textContent.trim()).not.toBe('');
    });

    it('should show empty placeholder for null value', () => {
        component.fieldValue = { ...mockFieldValue, value: null };
        fixture.detectChanges();

        const placeholder = de.query(By.css('.empty-placeholder'));
        expect(placeholder).toBeTruthy();
        expect(placeholder.nativeElement.textContent).toBe('—');
    });

    it('should show empty placeholder for undefined value', () => {
        component.fieldValue = { ...mockFieldValue, value: undefined };
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

    it('should show date input when editing', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.date-input'));
        expect(input).toBeTruthy();
        expect(input.nativeElement.type).toBe('date');
    });

    it('should show datetime-local input for datetime column type', () => {
        component.column = mockDateTimeColumn;
        component.fieldValue = { ...mockFieldValue, value: '2023-12-15T10:30:00Z' };
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.date-input'));
        expect(input).toBeTruthy();
        expect(input.nativeElement.type).toBe('datetime-local');
    });

    it('should format date for input field', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.date-input'));
        expect(input.nativeElement.value).toBe('2023-12-15');
    });

    it('should format datetime for input field', () => {
        component.column = mockDateTimeColumn;
        component.fieldValue = { ...mockFieldValue, value: '2023-12-15T10:30:00Z' };
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.date-input'));
        // Format should be YYYY-MM-DDTHH:MM
        expect(input.nativeElement.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('should handle empty input value', () => {
        component.fieldValue = { ...mockFieldValue, value: null };
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.date-input'));
        expect(input.nativeElement.value).toBe('');
    });

    it('should emit valueChange on date input change', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.valueChange, 'emit');

        const input = de.query(By.css('.date-input'));
        input.nativeElement.value = '2023-12-20';
        input.dispatchEvent(new Event('input'));

        expect(component.valueChange.emit).toHaveBeenCalled();
        expect(component.fieldValue.value).toContain('2023-12-20');
    });

    it('should emit null on empty date input', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.valueChange, 'emit');

        const input = de.query(By.css('.date-input'));
        input.nativeElement.value = '';
        input.dispatchEvent(new Event('input'));

        expect(component.valueChange.emit).toHaveBeenCalledWith(null);
        expect(component.fieldValue.value).toBe(null);
    });

    it('should parse date value correctly', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.date-input'));
        input.nativeElement.value = '2023-12-20';
        input.dispatchEvent(new Event('input'));

        // Should convert to ISO format
        expect(component.fieldValue.value).toBe('2023-12-20');
    });

    it('should parse datetime value correctly', () => {
        component.column = mockDateTimeColumn;
        component.isEditing = true;
        fixture.detectChanges();

        const input = de.query(By.css('.date-input'));
        input.nativeElement.value = '2023-12-20T14:30';
        input.dispatchEvent(new Event('input'));

        // Should convert to ISO format
        expect(component.fieldValue.value).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    });

    it('should stop editing on Enter key', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const input = de.query(By.css('.date-input'));
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        input.nativeElement.dispatchEvent(event);

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should cancel editing on Escape key', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const input = de.query(By.css('.date-input'));
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        input.nativeElement.dispatchEvent(event);

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should stop editing on blur', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const input = de.query(By.css('.date-input'));
        input.nativeElement.dispatchEvent(new Event('blur'));

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should format display value for date', () => {
        const formatted = component.formatDisplayValue('2023-12-15T00:00:00Z');
        expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Matches MM/DD/YYYY or DD/MM/YYYY
    });

    it('should format display value for datetime', () => {
        component.column = mockDateTimeColumn;
        const formatted = component.formatDisplayValue('2023-12-15T10:30:00Z');
        expect(formatted).not.toBe('');
    });

    it('should return empty string for null/undefined values', () => {
        expect(component.formatDisplayValue(null)).toBe('');
        expect(component.formatDisplayValue(undefined)).toBe('');
    });

    it('should handle invalid date in formatDisplayValue', () => {
        const formatted = component.formatDisplayValue('invalid-date');
        expect(formatted).toBe('invalid-date');
    });

    it('should validate valid date values', () => {
        expect(component.validateValue('2023-12-15T00:00:00Z')).toBe(true);
        expect(component.validateValue('2023-12-15')).toBe(true);
        expect(component.validateValue(new Date())).toBe(true);
    });

    it('should validate invalid date values', () => {
        expect(component.validateValue('invalid-date')).toBe(false);
        expect(component.validateValue('not-a-date')).toBe(false);
    });

    it('should validate null/empty values for optional columns', () => {
        component.column = { ...mockDateColumn, is_required: false };

        expect(component.validateValue(null)).toBe(true);
        expect(component.validateValue('')).toBe(true);
        expect(component.validateValue(undefined)).toBe(true);
    });

    it('should validate null/empty values for required columns', () => {
        component.column = { ...mockDateColumn, is_required: true };

        expect(component.validateValue(null)).toBe(false);
        expect(component.validateValue('')).toBe(false);
        expect(component.validateValue(undefined)).toBe(false);
    });

    it('should add date CSS classes for date column type', () => {
        component.column = mockDateColumn;
        fixture.detectChanges();

        const cellClasses = component.getCellClasses();
        expect(cellClasses).toContain('cell-date');

        const contentClasses = component.getContentClasses();
        expect(contentClasses).toContain('content-date');
    });

    it('should add datetime CSS classes for datetime column type', () => {
        component.column = mockDateTimeColumn;
        fixture.detectChanges();

        const cellClasses = component.getCellClasses();
        expect(cellClasses).toContain('cell-datetime');

        const contentClasses = component.getContentClasses();
        expect(contentClasses).toContain('content-datetime');
    });

    it('should show required indicator', () => {
        component.column = { ...mockDateColumn, is_required: true };
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

    it('should handle null column', () => {
        component.column = null as any;
        fixture.detectChanges();

        expect(component.formatInputValue('2023-12-15')).toBe('');
        expect(component.parseDateValue('2023-12-15')).toBeNull();
        expect(component.formatDisplayValue('2023-12-15')).toBe('2023-12-15');
        expect(component.validateValue('2023-12-15')).toBe(true);
    });

    it('should pad month and day with zeros in formatInputValue', () => {
        component.isEditing = true;
        component.fieldValue = { ...mockFieldValue, value: '2023-01-05T00:00:00Z' };
        fixture.detectChanges();

        const input = de.query(By.css('.date-input'));
        expect(input.nativeElement.value).toBe('2023-01-05');
    });

    it('should pad hours and minutes with zeros in formatInputValue for datetime', () => {
        component.column = mockDateTimeColumn;
        component.isEditing = true;
        component.fieldValue = { ...mockFieldValue, value: '2023-01-05T03:05:00Z' };
        fixture.detectChanges();

        const input = de.query(By.css('.date-input'));
        expect(input.nativeElement.value).toMatch(/2023-01-05T0[3]:[0]5/);
    });
});