import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { StatusCellRendererComponent } from './status-cell-renderer.component';
import { BoardColumn, TaskFieldValue, StatusOption } from '../../models';

describe('StatusCellRendererComponent', () => {
    let component: StatusCellRendererComponent;
    let fixture: ComponentFixture<StatusCellRendererComponent>;
    let de: DebugElement;

    const statusOptions: StatusOption[] = [
        { value: 'todo', label: 'To Do', color: '#6B7280' },
        { value: 'in_progress', label: 'In Progress', color: '#3B82F6' },
        { value: 'done', label: 'Done', color: '#10B981' }
    ];

    const mockStatusColumn: BoardColumn = {
        id: 1,
        board_id: 1,
        name: 'Status',
        type: 'status',
        position: 1,
        width: 150,
        is_pinned: false,
        is_required: false,
        options: {
            status_options: statusOptions
        },
        created_at: '2023-12-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
    };

    const mockPriorityColumn: BoardColumn = {
        ...mockStatusColumn,
        name: 'Priority',
        type: 'priority',
        options: {
            status_options: [
                { value: 'low', label: 'Low', color: '#6B7280' },
                { value: 'medium', label: 'Medium', color: '#F59E0B' },
                { value: 'high', label: 'High', color: '#EF4444' }
            ]
        }
    };

    const mockFieldValue: TaskFieldValue = {
        id: 1,
        task_id: 1,
        board_column_id: 1,
        value: 'in_progress',
        created_at: '2023-12-01T00:00:00Z',
        updated_at: '2023-12-01T00:00:00Z'
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [StatusCellRendererComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(StatusCellRendererComponent);
        component = fixture.componentInstance;
        de = fixture.debugElement;

        component.column = mockStatusColumn;
        component.fieldValue = mockFieldValue;
        component.taskId = 1;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display status badge with correct color and label', () => {
        const statusBadge = de.query(By.css('.status-badge'));
        expect(statusBadge).toBeTruthy();
        expect(statusBadge.nativeElement.textContent).toContain('In Progress');
        expect(statusBadge.nativeElement.style.backgroundColor).toBe('rgb(59, 130, 246)'); // #3B82F6
    });

    it('should show empty placeholder for null value', () => {
        component.fieldValue = { ...mockFieldValue, value: null };
        fixture.detectChanges();

        const placeholder = de.query(By.css('.empty-placeholder'));
        expect(placeholder).toBeTruthy();
        expect(placeholder.nativeElement.textContent).toBe('—');
    });

    it('should show empty placeholder for invalid status value', () => {
        component.fieldValue = { ...mockFieldValue, value: 'invalid_status' };
        fixture.detectChanges();

        const placeholder = de.query(By.css('.empty-placeholder'));
        expect(placeholder).toBeTruthy();
        expect(placeholder.nativeElement.textContent).toBe('—');
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

    it('should show select dropdown when editing', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const select = de.query(By.css('.status-select'));
        expect(select).toBeTruthy();
        expect(select.nativeElement.value).toBe('in_progress');
    });

    it('should populate select with status options', () => {
        component.isEditing = true;
        fixture.detectChanges();

        const options = de.queryAll(By.css('option'));
        // Should have empty option + 3 status options
        expect(options.length).toBe(4);

        const optionLabels = options.map(opt => opt.nativeElement.textContent.trim());
        expect(optionLabels).toContain('—');
        expect(optionLabels).toContain('To Do');
        expect(optionLabels).toContain('In Progress');
        expect(optionLabels).toContain('Done');
    });

    it('should not show empty option for required columns', () => {
        component.column = { ...mockStatusColumn, is_required: true };
        component.isEditing = true;
        fixture.detectChanges();

        const options = de.queryAll(By.css('option'));
        // Should only have 3 status options, no empty option
        expect(options.length).toBe(3);

        const optionLabels = options.map(opt => opt.nativeElement.textContent.trim());
        expect(optionLabels).not.toContain('—');
    });

    it('should emit valueChange on selection change', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.valueChange, 'emit');

        const select = de.query(By.css('.status-select'));
        select.nativeElement.value = 'done';
        select.dispatchEvent(new Event('change'));

        expect(component.valueChange.emit).toHaveBeenCalledWith('done');
        expect(component.fieldValue.value).toBe('done');
    });

    it('should emit null when empty option selected', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.valueChange, 'emit');

        const select = de.query(By.css('.status-select'));
        select.nativeElement.value = '';
        select.dispatchEvent(new Event('change'));

        expect(component.valueChange.emit).toHaveBeenCalledWith(null);
        expect(component.fieldValue.value).toBe(null);
    });

    it('should stop editing on Enter key', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const select = de.query(By.css('.status-select'));
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        select.nativeElement.dispatchEvent(event);

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should cancel editing on Escape key', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const select = de.query(By.css('.status-select'));
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        select.nativeElement.dispatchEvent(event);

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should stop editing on blur', () => {
        component.isEditing = true;
        fixture.detectChanges();

        spyOn(component.editEnd, 'emit');

        const select = de.query(By.css('.status-select'));
        select.nativeElement.dispatchEvent(new Event('blur'));

        expect(component.editEnd.emit).toHaveBeenCalled();
    });

    it('should get status options correctly', () => {
        const options = component.getStatusOptions();
        expect(options).toEqual(statusOptions);
    });

    it('should handle missing status options', () => {
        component.column = { ...mockStatusColumn, options: {} };
        fixture.detectChanges();

        const options = component.getStatusOptions();
        expect(options).toEqual([]);
    });

    it('should get status option by value', () => {
        const option = component.getStatusOption('in_progress');
        expect(option).toEqual({
            value: 'in_progress',
            label: 'In Progress',
            color: '#3B82F6'
        });
    });

    it('should return undefined for non-existent status value', () => {
        const option = component.getStatusOption('non_existent');
        expect(option).toBeUndefined();
    });

    it('should format display value correctly', () => {
        expect(component.formatDisplayValue('todo')).toBe('To Do');
        expect(component.formatDisplayValue('in_progress')).toBe('In Progress');
        expect(component.formatDisplayValue('invalid')).toBe('invalid');
        expect(component.formatDisplayValue(null)).toBe('');
        expect(component.formatDisplayValue(undefined)).toBe('');
    });

    it('should validate valid status values', () => {
        expect(component.validateValue('todo')).toBe(true);
        expect(component.validateValue('in_progress')).toBe(true);
        expect(component.validateValue('done')).toBe(true);
    });

    it('should validate invalid status values', () => {
        expect(component.validateValue('invalid')).toBe(false);
        expect(component.validateValue('random')).toBe(false);
    });

    it('should validate null/empty values for optional columns', () => {
        component.column = { ...mockStatusColumn, is_required: false };

        expect(component.validateValue(null)).toBe(true);
        expect(component.validateValue('')).toBe(true);
        expect(component.validateValue(undefined)).toBe(true);
    });

    it('should validate null/empty values for required columns', () => {
        component.column = { ...mockStatusColumn, is_required: true };

        expect(component.validateValue(null)).toBe(false);
        expect(component.validateValue('')).toBe(false);
        expect(component.validateValue(undefined)).toBe(false);
    });

    it('should add status CSS classes for status column type', () => {
        component.column = mockStatusColumn;
        fixture.detectChanges();

        const cellClasses = component.getCellClasses();
        expect(cellClasses).toContain('cell-status');

        const contentClasses = component.getContentClasses();
        expect(contentClasses).toContain('content-status');
    });

    it('should add priority CSS classes for priority column type', () => {
        component.column = mockPriorityColumn;
        fixture.detectChanges();

        const cellClasses = component.getCellClasses();
        expect(cellClasses).toContain('cell-priority');

        const contentClasses = component.getContentClasses();
        expect(contentClasses).toContain('content-priority');
    });

    it('should show required indicator', () => {
        component.column = { ...mockStatusColumn, is_required: true };
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

        expect(component.getStatusOptions()).toEqual([]);
        expect(component.getStatusOption('any')).toBeUndefined();
        expect(component.formatDisplayValue('test')).toBe('test');
        expect(component.validateValue('test')).toBe(true);
    });
});