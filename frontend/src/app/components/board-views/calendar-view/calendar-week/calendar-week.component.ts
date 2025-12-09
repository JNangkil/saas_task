import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Task } from '../../../../models/task.model';

@Component({
    selector: 'app-calendar-week',
    standalone: true,
    imports: [CommonModule, DragDropModule],
    templateUrl: './calendar-week.component.html',
    styleUrls: ['./calendar-week.component.scss']
})
export class CalendarWeekComponent implements OnChanges {
    @Input() tasks: Task[] = [];
    @Input() viewDate: Date = new Date();
    @Output() taskDrop = new EventEmitter<{ task: Task, newDate: string }>();
    @Output() taskClick = new EventEmitter<Task>();

    weekDays: any[] = [];

    @Input() dateDisplayMode: 'due_date' | 'start_date' = 'due_date';

    ngOnChanges(changes: SimpleChanges) {
        if (changes['viewDate'] || changes['tasks'] || changes['dateDisplayMode']) {
            this.generateWeekView();
        }
    }

    generateWeekView() {
        const startOfWeek = this.getStartOfWeek(this.viewDate);

        this.weekDays = [];
        const currentDate = new Date(startOfWeek);

        for (let i = 0; i < 7; i++) {
            const date = new Date(currentDate);
            const dateStr = date.toISOString().split('T')[0];

            this.weekDays.push({
                date: date,
                id: dateStr,
                tasks: this.getTasksForDate(date),
                isToday: new Date().toDateString() === date.toDateString()
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    getStartOfWeek(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day; // Adjust so sunday is first
        return new Date(d.setDate(diff));
    }

    getTasksForDate(date: Date): Task[] {
        const dateStr = date.toISOString().split('T')[0];

        return this.tasks.filter(t => {
            let matches = false;

            // Check for multi-day span
            if (t.start_date && t.due_date) {
                const startStr = new Date(t.start_date).toISOString().split('T')[0];
                const endStr = new Date(t.due_date).toISOString().split('T')[0];

                if (dateStr >= startStr && dateStr <= endStr) {
                    matches = true;
                }
            }

            // Fallback to single date check based on mode
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
}
