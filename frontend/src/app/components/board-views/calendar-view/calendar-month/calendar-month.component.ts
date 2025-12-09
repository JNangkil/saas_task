import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Task } from '../../../../models/task.model';

@Component({
    selector: 'app-calendar-month',
    standalone: true,
    imports: [CommonModule, DragDropModule],
    templateUrl: './calendar-month.component.html',
    styleUrls: ['./calendar-month.component.scss']
})
export class CalendarMonthComponent implements OnChanges {
    @Input() tasks: Task[] = [];
    @Input() viewDate: Date = new Date();
    @Output() taskDrop = new EventEmitter<{ task: Task, newDate: string }>();
    @Output() taskClick = new EventEmitter<Task>();

    calendarDays: any[] = [];

    @Input() dateDisplayMode: 'due_date' | 'start_date' = 'due_date';

    ngOnChanges(changes: SimpleChanges) {
        if (changes['viewDate'] || changes['tasks'] || changes['dateDisplayMode']) {
            this.generateMonthView();
        }
    }

    generateMonthView() {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();

        // Find first day of the month
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Calculate start date (going back to previous Sunday if needed)
        const startDay = firstDayOfMonth.getDay(); // 0 (Sunday) to 6 (Saturday)
        const startDate = new Date(year, month, 1 - startDay);

        // We want a 6-week grid (42 days) to cover all possibilities consistently
        this.calendarDays = [];
        const currentDate = new Date(startDate);

        for (let i = 0; i < 42; i++) {
            const date = new Date(currentDate);
            const dateStr = date.toISOString().split('T')[0];

            this.calendarDays.push({
                date: date,
                id: dateStr,
                tasks: this.getTasksForDate(date),
                isToday: new Date().toDateString() === date.toDateString()
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    getTasksForDate(date: Date): Task[] {
        const dateTimestamp = date.getTime();
        const dateStr = date.toISOString().split('T')[0]; // Compare strings to avoid time issues

        return this.tasks.filter(t => {
            let matches = false;

            // Check for multi-day span first
            if (t.start_date && t.due_date) {
                const startStr = new Date(t.start_date).toISOString().split('T')[0];
                const endStr = new Date(t.due_date).toISOString().split('T')[0];

                if (dateStr >= startStr && dateStr <= endStr) {
                    matches = true;
                }
            }

            // Fallback to single date check based on mode if no span matched (or strictly check mode behavior?)
            // If we want multi-day to ALWAYS show, we use the above.
            // But if a task only has one date, we check the mode.
            if (!matches) {
                if (this.dateDisplayMode === 'due_date' && t.due_date) {
                    const dStr = new Date(t.due_date).toISOString().split('T')[0];
                    if (dStr === dateStr) matches = true;
                } else if (this.dateDisplayMode === 'start_date' && t.start_date) {
                    const sStr = new Date(t.start_date).toISOString().split('T')[0];
                    if (sStr === dateStr) matches = true;
                }
            }

            return matches;
        });
    }

    isSameMonth(date: Date): boolean {
        return date.getMonth() === this.viewDate.getMonth();
    }

    onDrop(event: CdkDragDrop<Task[]>, dateStr: string) {
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex,
            );

            const task = event.container.data[event.currentIndex];
            this.taskDrop.emit({ task, newDate: dateStr });
        }
    }

    onTaskClick(task: Task, event: Event) {
        event.stopPropagation();
        this.taskClick.emit(task);
    }

    getTaskClass(task: Task): string {
        const base = 'text-xs p-1 rounded border truncate cursor-pointer relative group transition-colors block mb-1';

        switch (task.priority) {
            case 'urgent':
            case 'high':
                return `${base} bg-red-50 text-red-700 border-red-100 hover:bg-red-100`;
            case 'medium':
                return `${base} bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100`;
            case 'low':
                return `${base} bg-green-50 text-green-700 border-green-100 hover:bg-green-100`;
            default:
                return `${base} bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100`;
        }
    }
}
