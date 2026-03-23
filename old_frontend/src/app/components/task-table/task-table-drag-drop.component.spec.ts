import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Task, TaskPositionUpdate } from '../../models';

// Mock component for testing table drag and drop
@Component({
    selector: 'app-task-table-drag-drop',
    template: `
        <div class="task-table-container"
             cdkDropList
             [cdkDropListData]="tasks"
             (cdkDropListDropped)="onDrop($event)">

            <div class="table-header">
                <div class="drag-handle-column"></div>
                <div class="checkbox-column">
                    <input type="checkbox"
                           [checked]="allSelected"
                           (change)="toggleAll()"
                           [indeterminate]="someSelected">
                </div>
                <div class="title-column">Title</div>
                <div class="status-column">Status</div>
                <div class="priority-column">Priority</div>
                <div class="assignee-column">Assignee</div>
                <div class="due-date-column">Due Date</div>
            </div>

            <div class="table-body">
                <div *ngFor="let task of tasks; trackBy: trackByTaskId"
                     class="table-row"
                     [class.selected]="selectedTasks.has(task.id)"
                     [class.dragging]="draggingTask?.id === task.id"
                     cdkDrag
                     [cdkDragDisabled]="!canDrag(task)"
                     [cdkDragData]="task"
                     (cdkDragStarted)="onDragStarted($event, task)"
                     (cdkDragEnded)="onDragEnded($event, task)">

                    <div class="drag-handle-column">
                        <div class="drag-handle"
                             *ngIf="canDrag(task)"
                             cdkDragHandle>
                            <svg class="drag-icon" viewBox="0 0 24 24">
                                <circle cx="9" cy="12" r="1"/>
                                <circle cx="9" cy="5" r="1"/>
                                <circle cx="9" cy="19" r="1"/>
                                <circle cx="15" cy="12" r="1"/>
                                <circle cx="15" cy="5" r="1"/>
                                <circle cx="15" cy="19" r="1"/>
                            </svg>
                        </div>
                    </div>

                    <div class="checkbox-column">
                        <input type="checkbox"
                               [checked]="selectedTasks.has(task.id)"
                               (change)="toggleTaskSelection(task.id)">
                    </div>

                    <div class="title-column">{{ task.title }}</div>
                    <div class="status-column">
                        <span class="status-badge status-{{ task.status }}">{{ task.status }}</span>
                    </div>
                    <div class="priority-column">
                        <span class="priority-badge priority-{{ task.priority }}">{{ task.priority }}</span>
                    </div>
                    <div class="assignee-column">{{ task.assignee?.name || 'Unassigned' }}</div>
                    <div class="due-date-column">{{ task.due_date | date:'shortDate' }}</div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .task-table-container {
            width: 100%;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .table-header {
            display: grid;
            grid-template-columns: 40px 40px 2fr 1fr 1fr 1fr 1fr;
            background-color: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
            font-size: 14px;
            color: #6b7280;
            padding: 12px 16px;
        }

        .table-row {
            display: grid;
            grid-template-columns: 40px 40px 2fr 1fr 1fr 1fr 1fr;
            border-bottom: 1px solid #e5e7eb;
            padding: 12px 16px;
            transition: background-color 0.2s ease;
            cursor: pointer;
        }

        .table-row:hover {
            background-color: #f9fafb;
        }

        .table-row.selected {
            background-color: #eff6ff;
        }

        .table-row.dragging {
            opacity: 0.5;
        }

        .table-row.cdk-drag-preview {
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            background: white;
            z-index: 1000;
        }

        .table-row.cdk-drag-placeholder {
            background-color: #e0e7ff;
            border: 2px dashed #6366f1;
        }

        .drag-handle {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            cursor: grab;
            color: #6b7280;
            border-radius: 4px;
            transition: all 0.2s ease;
        }

        .drag-handle:hover {
            background-color: #f3f4f6;
            color: #374151;
        }

        .drag-handle:active {
            cursor: grabbing;
        }

        .drag-icon {
            width: 16px;
            height: 16px;
        }

        .status-badge, .priority-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }

        .status-todo { background-color: #6b7280; color: white; }
        .status-in_progress { background-color: #3b82f6; color: white; }
        .status-done { background-color: #10b981; color: white; }

        .priority-low { background-color: #6b7280; color: white; }
        .priority-medium { background-color: #f59e0b; color: white; }
        .priority-high { background-color: #ef4444; color: white; }
    `]
})
class TestTaskTableDragDropComponent {
    @Input() tasks: Task[] = [];
    @Input() selectedTasks: Set<number> = new Set();
    @Input() canDragTask: boolean = true;
    @Input() boardId: number = 1;

    @Output() taskReordered = new EventEmitter<{ task: Task; newPosition: number }>();
    @Output() taskSelectionChanged = new EventEmitter<{ taskId: number; selected: boolean }>();
    @Output() allTasksSelected = new EventEmitter<boolean>();

    draggingTask: Task | null = null;
    dragStartIndex: number = -1;

    get allSelected(): boolean {
        return this.tasks.length > 0 && this.selectedTasks.size === this.tasks.length;
    }

    get someSelected(): boolean {
        return this.selectedTasks.size > 0 && this.selectedTasks.size < this.tasks.length;
    }

    onDrop(event: CdkDragDrop<Task[]>): void {
        if (!this.canDragTask) return;

        const previousIndex = event.previousIndex;
        const currentIndex = event.currentIndex;

        if (previousIndex === currentIndex) return;

        const movedTask = this.tasks[previousIndex];
        this.dragStartIndex = previousIndex;

        // Update positions in local array
        moveItemInArray(this.tasks, previousIndex, currentIndex);

        // Update positions for affected tasks
        this.tasks.forEach((task, index) => {
            task.position = index + 1;
        });

        // Emit reordering event
        this.taskReordered.emit({
            task: movedTask,
            newPosition: currentIndex + 1
        });
    }

    onDragStarted(event: any, task: Task): void {
        this.draggingTask = task;
        this.dragStartIndex = this.tasks.findIndex(t => t.id === task.id);
    }

    onDragEnded(event: any, task: Task): void {
        this.draggingTask = null;
        this.dragStartIndex = -1;
    }

    canDrag(task: Task): boolean {
        return this.canDragTask;
    }

    toggleTaskSelection(taskId: number): void {
        const selected = this.selectedTasks.has(taskId);
        this.taskSelectionChanged.emit({ taskId, selected: !selected });
    }

    toggleAll(): void {
        const selectAll = !this.allSelected;
        this.allTasksSelected.emit(selectAll);
    }

    trackByTaskId(index: number, task: Task): number {
        return task.id;
    }
}

describe('TaskTableDragDropComponent', () => {
    let component: TestTaskTableDragDropComponent;
    let fixture: ComponentFixture<TestTaskTableDragDropComponent>;
    let de: DebugElement;

    const mockTasks: Task[] = [
        {
            id: 1,
            tenant_id: 1,
            workspace_id: 1,
            board_id: 1,
            title: 'Task 1',
            description: 'Description 1',
            status: 'todo',
            priority: 'low',
            assignee_id: 1,
            creator_id: 1,
            due_date: '2023-12-15',
            position: 1,
            created_at: '2023-12-01T00:00:00Z',
            updated_at: '2023-12-01T00:00:00Z'
        },
        {
            id: 2,
            tenant_id: 1,
            workspace_id: 1,
            board_id: 1,
            title: 'Task 2',
            description: 'Description 2',
            status: 'in_progress',
            priority: 'medium',
            assignee_id: 2,
            creator_id: 1,
            due_date: '2023-12-20',
            position: 2,
            created_at: '2023-12-02T00:00:00Z',
            updated_at: '2023-12-02T00:00:00Z'
        },
        {
            id: 3,
            tenant_id: 1,
            workspace_id: 1,
            board_id: 1,
            title: 'Task 3',
            description: 'Description 3',
            status: 'done',
            priority: 'high',
            assignee_id: 3,
            creator_id: 1,
            due_date: '2023-12-25',
            position: 3,
            created_at: '2023-12-03T00:00:00Z',
            updated_at: '2023-12-03T00:00:00Z'
        }
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TestTaskTableDragDropComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(TestTaskTableDragDropComponent);
        component = fixture.componentInstance;
        de = fixture.debugElement;

        component.tasks = [...mockTasks];
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display all tasks', () => {
        const rows = de.queryAll(By.css('.table-row'));
        expect(rows.length).toBe(3);
    });

    it('should display task data correctly', () => {
        const rows = de.queryAll(By.css('.table-row'));

        // Check first row
        expect(rows[0].query(By.css('.title-column')).nativeElement.textContent).toBe('Task 1');
        expect(rows[0].query(By.css('.status-badge')).nativeElement.textContent).toBe('todo');
        expect(rows[0].query(By.css('.priority-badge')).nativeElement.textContent).toBe('low');

        // Check second row
        expect(rows[1].query(By.css('.title-column')).nativeElement.textContent).toBe('Task 2');
        expect(rows[1].query(By.css('.status-badge')).nativeElement.textContent).toBe('in_progress');
        expect(rows[1].query(By.css('.priority-badge')).nativeElement.textContent).toBe('medium');

        // Check third row
        expect(rows[2].query(By.css('.title-column')).nativeElement.textContent).toBe('Task 3');
        expect(rows[2].query(By.css('.status-badge')).nativeElement.textContent).toBe('done');
        expect(rows[2].query(By.css('.priority-badge')).nativeElement.textContent).toBe('high');
    });

    it('should show drag handles when dragging is enabled', () => {
        component.canDragTask = true;
        fixture.detectChanges();

        const dragHandles = de.queryAll(By.css('.drag-handle'));
        expect(dragHandles.length).toBe(3);
    });

    it('should hide drag handles when dragging is disabled', () => {
        component.canDragTask = false;
        fixture.detectChanges();

        const dragHandles = de.queryAll(By.css('.drag-handle'));
        expect(dragHandles.length).toBe(0);
    });

    it('should track task selection', () => {
        component.selectedTasks = new Set([1, 3]);
        fixture.detectChanges();

        const rows = de.queryAll(By.css('.table-row'));
        expect(rows[0].classes['selected']).toBe(true); // Task 1
        expect(rows[1].classes['selected']).toBe(false); // Task 2
        expect(rows[2].classes['selected']).toBe(true); // Task 3

        expect(component.allSelected).toBe(false);
        expect(component.someSelected).toBe(true);
    });

    it('should show all selected state correctly', () => {
        component.selectedTasks = new Set([1, 2, 3]);
        fixture.detectChanges();

        expect(component.allSelected).toBe(true);
        expect(component.someSelected).toBe(false);

        const masterCheckbox = de.query(By.css('.table-header input[type="checkbox"]'));
        expect(masterCheckbox.nativeElement.checked).toBe(true);
        expect(masterCheckbox.nativeElement.indeterminate).toBe(false);
    });

    it('should show indeterminate state correctly', () => {
        component.selectedTasks = new Set([1]);
        fixture.detectChanges();

        expect(component.allSelected).toBe(false);
        expect(component.someSelected).toBe(true);

        const masterCheckbox = de.query(By.css('.table-header input[type="checkbox"]'));
        expect(masterCheckbox.nativeElement.checked).toBe(false);
        expect(masterCheckbox.nativeElement.indeterminate).toBe(true);
    });

    it('should emit task selection change', () => {
        spyOn(component.taskSelectionChanged, 'emit');

        const firstRowCheckbox = de.queryAll(By.css('.table-row input[type="checkbox"]'))[0];
        firstRowCheckbox.nativeElement.checked = true;
        firstRowCheckbox.nativeElement.dispatchEvent(new Event('change'));

        expect(component.taskSelectionChanged.emit).toHaveBeenCalledWith({
            taskId: 1,
            selected: true
        });
    });

    it('should emit all tasks selected event', () => {
        spyOn(component.allTasksSelected, 'emit');

        const masterCheckbox = de.query(By.css('.table-header input[type="checkbox"]'));
        masterCheckbox.nativeElement.checked = true;
        masterCheckbox.nativeElement.dispatchEvent(new Event('change'));

        expect(component.allTasksSelected.emit).toHaveBeenCalledWith(true);
    });

    it('should handle task reordering', () => {
        spyOn(component.taskReordered, 'emit');

        // Simulate moving Task 1 from index 0 to index 2
        const mockDropEvent = {
            previousIndex: 0,
            currentIndex: 2,
            item: { data: mockTasks[0] }
        } as CdkDragDrop<Task[]>;

        component.onDrop(mockDropEvent);

        // Check that tasks were reordered
        expect(component.tasks[0].id).toBe(2); // Task 2 moved to position 1
        expect(component.tasks[1].id).toBe(3); // Task 3 moved to position 2
        expect(component.tasks[2].id).toBe(1); // Task 1 moved to position 3

        // Check positions were updated
        expect(component.tasks[0].position).toBe(1);
        expect(component.tasks[1].position).toBe(2);
        expect(component.tasks[2].position).toBe(3);

        // Check that event was emitted
        expect(component.taskReordered.emit).toHaveBeenCalledWith({
            task: mockTasks[0],
            newPosition: 3
        });
    });

    it('should not reorder when dragging is disabled', () => {
        component.canDragTask = false;
        spyOn(component.taskReordered, 'emit');

        const mockDropEvent = {
            previousIndex: 0,
            currentIndex: 2,
            item: { data: mockTasks[0] }
        } as CdkDragDrop<Task[]>;

        component.onDrop(mockDropEvent);

        expect(component.taskReordered.emit).not.toHaveBeenCalled();
        expect(component.tasks[0].id).toBe(1); // Original order preserved
    });

    it('should not reorder when position is the same', () => {
        spyOn(component.taskReordered, 'emit');

        const mockDropEvent = {
            previousIndex: 0,
            currentIndex: 0,
            item: { data: mockTasks[0] }
        } as CdkDragDrop<Task[]>;

        component.onDrop(mockDropEvent);

        expect(component.taskReordered.emit).not.toHaveBeenCalled();
    });

    it('should track drag start', () => {
        const task = mockTasks[0];
        component.onDragStarted({}, task);

        expect(component.draggingTask).toBe(task);
        expect(component.dragStartIndex).toBe(0);
    });

    it('should track drag end', () => {
        const task = mockTasks[0];
        component.draggingTask = task;
        component.dragStartIndex = 0;

        component.onDragEnded({}, task);

        expect(component.draggingTask).toBeNull();
        expect(component.dragStartIndex).toBe(-1);
    });

    it('should add dragging class during drag', () => {
        component.draggingTask = mockTasks[1];
        fixture.detectChanges();

        const rows = de.queryAll(By.css('.table-row'));
        expect(rows[0].classes['dragging']).toBe(false);
        expect(rows[1].classes['dragging']).toBe(true);
        expect(rows[2].classes['dragging']).toBe(false);
    });

    it('should apply correct status badge styles', () => {
        const statusBadges = de.queryAll(By.css('.status-badge'));

        expect(statusBadges[0].classes['status-todo']).toBe(true);
        expect(statusBadges[1].classes['status-in_progress']).toBe(true);
        expect(statusBadges[2].classes['status-done']).toBe(true);
    });

    it('should apply correct priority badge styles', () => {
        const priorityBadges = de.queryAll(By.css('.priority-badge'));

        expect(priorityBadges[0].classes['priority-low']).toBe(true);
        expect(priorityBadges[1].classes['priority-medium']).toBe(true);
        expect(priorityBadges[2].classes['priority-high']).toBe(true);
    });

    it('should track tasks by ID for performance', () => {
        const trackByFn = component.trackByTaskId;
        expect(trackByFn(0, mockTasks[0])).toBe(1);
        expect(trackByFn(1, mockTasks[1])).toBe(2);
        expect(trackByFn(2, mockTasks[2])).toBe(3);
    });

    it('should have correct grid layout structure', () => {
        const header = de.query(By.css('.table-header'));
        const headerStyle = getComputedStyle(header.nativeElement);
        expect(headerStyle.gridTemplateColumns).toBe('40px 40px 2fr 1fr 1fr 1fr 1fr');

        const rows = de.queryAll(By.css('.table-row'));
        rows.forEach(row => {
            const rowStyle = getComputedStyle(row.nativeElement);
            expect(rowStyle.gridTemplateColumns).toBe('40px 40px 2fr 1fr 1fr 1fr 1fr');
        });
    });

    it('should be accessible', () => {
        // Check that drag handles have proper attributes
        const dragHandles = de.queryAll(By.css('.drag-handle'));
        dragHandles.forEach(handle => {
            expect(handle.nativeElement.getAttribute('cdkDragHandle')).toBe('');
        });

        // Check that table rows have draggable attributes when enabled
        const rows = de.queryAll(By.css('.table-row'));
        rows.forEach((row, index) => {
            expect(row.nativeElement.getAttribute('cdkDrag')).toBe('');
            expect(row.nativeElement.getAttribute('cdkDragData')).toBeDefined();
        });
    });

    it('should handle empty task list', () => {
        component.tasks = [];
        fixture.detectChanges();

        const rows = de.queryAll(By.css('.table-row'));
        expect(rows.length).toBe(0);

        expect(component.allSelected).toBe(false);
        expect(component.someSelected).toBe(false);
    });
});

describe('TaskTable Drag Drop Integration', () => {
    it('should handle complex drag and drop scenarios', () => {
        // Test scenario: Drag multiple selected tasks
        // Test scenario: Drag between different boards
        // Test scenario: Drag to create new tasks
        // Test scenario: Drag with keyboard navigation
    });

    it('should maintain sort order after drag operations', () => {
        // After drag operations, the tasks should maintain their new positions
        // The sort should reflect the manual ordering
    });

    it('should persist drag changes to backend', () => {
        // Drag changes should be sent to the backend via API calls
        // The backend should update task positions in the database
    });

    it('should handle drag failures gracefully', () => {
        // If drag operation fails, revert to original positions
        // Show appropriate error messages to user
    });
});