import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { CheckboxCellRendererComponent } from './checkbox-cell-renderer.component';
import { BoardColumn, TaskFieldValue } from '../../models';

describe('CheckboxCellRendererComponent', () => {
    let component: CheckboxCellRendererComponent;
    let fixture: ComponentFixture<CheckboxCellRendererComponent>;
    let de: DebugElement;

    const mockColumn: BoardColumn = {
        id: 1,
        board_id: 1,
        name: 'Completed',
        type: 'checkbox',
        position: 1,
        width: 100,
        is_pinned: false,
        is_required: false,
        options: {
            default_value: false
        },
        created_at: '2023-12-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
    };

    const mockCheckedValue: TaskFieldValue = {
        id: 1,
        task_id: 1,
        board_column_id: 1,
        value: true,
        created_at: '2023-12-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
    };

    const mockUncheckedValue: TaskFieldValue = {
        id: 1,
        task_id: 1,
        board_column_id: 1,
        value: false,
        created_at: '2023-12-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CheckboxCellRendererComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(CheckboxCellRendererComponent);
        component = fixture.componentInstance;
        de = fixture.debugElement;

        component.column = mockColumn;
        component.fieldValue = mockCheckedValue;
        component.taskId = 1;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display checked checkbox for true value', () => {
        component.fieldValue = mockCheckedValue;
        fixture.detectChanges();

        const checkbox = de.query(By.css('.checkbox-input'));
        expect(checkbox.nativeElement.checked).toBe(true);
        expect(checkbox.nativeElement.classList.contains('editing')).toBe(false);
    });

    it('should display unchecked checkbox for false value', () => {
        component.fieldValue = mockUncheckedValue;
        fixture.detectChanges();

        const checkbox = de.query(By.css('.checkbox-input'));
        expect(checkbox.nativeElement.checked).toBe(false);
    });

    it('should display unchecked checkbox for null/undefined value', () => {
        component.fieldValue = { ...mockCheckedValue, value: null };
        fixture.detectChanges();

        const checkbox = de.query(By.css('.checkbox-input'));
        expect(checkbox.nativeElement.checked).toBe(false);
    });

    it('should toggle value on click when not readonly', () => {
        spyOn(component.valueChange, 'emit');

        const cellRenderer = de.query(By.css('.cell-renderer'));
        cellRenderer.nativeElement.click();

        expect(component.fieldValue.value).toBe(false);
        expect(component.valueChange.emit).toHaveBeenCalledWith(false);
    });

    it('should not toggle value when readonly', () => {
        component.readonly = true;
        fixture.detectChanges();

        spyOn(component.valueChange, 'emit');

        const cellRenderer = de.query(By.css('.cell-renderer'));
        cellRenderer.nativeElement.click();

        expect(component.fieldValue.value).toBe(true);
        expect(component.valueChange.emit).not.toHaveBeenCalled();
    });

    it('should not toggle value when editing', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.valueChange, 'emit');

        const cellRenderer = de.query(By.css('.cell-renderer'));
        cellRenderer.nativeElement.click();

        expect(component.fieldValue.value).toBe(true);
        expect(component.valueChange.emit).not.toHaveBeenCalled();
    });

    it('should show editing state checkbox when editing', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const checkbox = de.query(By.css('.checkbox-input'));
        expect(checkbox.nativeElement.classList.contains('editing')).toBe(true);
    });

    it('should emit valueChange on checkbox change in editing mode', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.valueChange, 'emit');

        const checkbox = de.query(By.css('.checkbox-input'));
        checkbox.nativeElement.checked = false;
        checkbox.dispatchEvent(new Event('change'));

        expect(component.fieldValue.value).toBe(false);
        expect(component.valueChange.emit).toHaveBeenCalledWith(false);
    });

    it('should stop editing on Enter key', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const checkbox = de.query(By.css('.checkbox-input'));
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        checkbox.nativeElement.dispatchEvent(event);

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should cancel editing on Escape key', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const checkbox = de.query(By.css('.checkbox-input'));
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        checkbox.nativeElement.dispatchEvent(event);

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should stop editing on blur', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const checkbox = de.query(By.css('.checkbox-input'));
        checkbox.nativeElement.dispatchEvent(new Event('blur'));

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should prevent checkbox click event propagation', () => {
        spyOn(component.valueChange, 'emit');
        spyOn(Event.prototype, 'stopPropagation');

        const checkbox = de.query(By.css('.checkbox-input'));
        checkbox.nativeElement.click();

        expect(Event.prototype.stopPropagation).toHaveBeenCalled();
    });

    it('should format display value correctly', () => {
        expect(component.formatDisplayValue(true)).toBe('Yes');
        expect(component.formatDisplayValue(false)).toBe('No');
        expect(component.formatDisplayValue(null)).toBe('No');
        expect(component.formatDisplayValue(undefined)).toBe('No');
    });

    it('should validate boolean values', () => {
        expect(component.validateValue(true)).toBe(true);
        expect(component.validateValue(false)).toBe(true);
    });

    it('should validate non-boolean values', () => {
        expect(component.validateValue('true')).toBe(false);
        expect(component.validateValue(1)).toBe(false);
        expect(component.validateValue(null)).toBe(false);
        expect(component.validateValue(undefined)).toBe(false);
    });

    it('should add checkbox CSS classes', () => {
        const cellClasses = component.getCellClasses();
        expect(cellClasses).toContain('cell-renderer');
        expect(cellClasses).toContain('cell-checkbox');

        const contentClasses = component.getContentClasses();
        expect(contentClasses).toContain('cell-content');
        expect(contentClasses).toContain('content-checkbox');
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

        const checkbox = de.query(By.css('.checkbox-input'));
        expect(checkbox.nativeElement.disabled).toBe(true);
    });

    it('should add editing class when editing', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const classes = component.getCellClasses();
        expect(classes).toContain('cell-editing');
    });

    it('should toggle from false to true', () => {
        component.fieldValue = mockUncheckedValue;
        fixture.detectChanges();

        spyOn(component.valueChange, 'emit');

        const cellRenderer = de.query(By.css('.cell-renderer'));
        cellRenderer.nativeElement.click();

        expect(component.fieldValue.value).toBe(true);
        expect(component.valueChange.emit).toHaveBeenCalledWith(true);

        const checkbox = de.query(By.css('.checkbox-input'));
        expect(checkbox.nativeElement.checked).toBe(true);
    });

    it('should toggle from true to false', () => {
        component.fieldValue = mockCheckedValue;
        fixture.detectChanges();

        spyOn(component.valueChange, 'emit');

        const cellRenderer = de.query(By.css('.cell-renderer'));
        cellRenderer.nativeElement.click();

        expect(component.fieldValue.value).toBe(false);
        expect(component.valueChange.emit).toHaveBeenCalledWith(false);

        const checkbox = de.query(By.css('.checkbox-input'));
        expect(checkbox.nativeElement.checked).toBe(false);
    });

    it('should handle string boolean values', () => {
        component.fieldValue = { ...mockCheckedValue, value: 'true' };
        fixture.detectChanges();

        const checkbox = de.query(By.css('.checkbox-input'));
        // Coercion to boolean
        expect(checkbox.nativeElement.checked).toBe(true);
    });

    it('should handle zero and one values', () => {
        component.fieldValue = { ...mockCheckedValue, value: 1 };
        fixture.detectChanges();

        const checkbox = de.query(By.css('.checkbox-input'));
        // Coercion to boolean
        expect(checkbox.nativeElement.checked).toBe(true);

        component.fieldValue = { ...mockCheckedValue, value: 0 };
        fixture.detectChanges();

        expect(checkbox.nativeElement.checked).toBe(false);
    });

    it('should handle null column', () => {
        component.column = null as any;
        fixture.detectChanges();

        expect(component.formatDisplayValue(true)).toBe('Yes');
        expect(component.validateValue(true)).toBe(true);

        const classes = component.getCellClasses();
        expect(classes).toContain('cell-checkbox');
    });

    it('should center checkbox in cell', () => {
        const cellContent = de.query(By.css('.cell-content'));
        const computedStyle = getComputedStyle(cellContent.nativeElement);
        expect(computedStyle.justifyContent).toBe('center');
    });

    it('should set checkbox attributes correctly', () => {
        const checkbox = de.query(By.css('.checkbox-input'));
        expect(checkbox.nativeElement.type).toBe('checkbox');
        expect(checkbox.nativeElement.width).toBe(16);
        expect(checkbox.nativeElement.height).toBe(16);
    });

    it('should focus on checkbox when entering edit mode', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const checkbox = de.query(By.css('.checkbox-input'));
        expect(checkbox.nativeElement.hasAttribute('autofocus')).toBe(true);
    });
});