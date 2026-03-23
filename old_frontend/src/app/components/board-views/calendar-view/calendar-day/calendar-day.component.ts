import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../../../models/task.model';

@Component({
    selector: 'app-calendar-day',
    standalone: true,
    imports: [CommonModule],
    template: `
      <div class="h-full flex flex-col p-4 overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4">{{ viewDate | date:'fullDate' }}</h3>
        <div class="space-y-2">
            <div *ngFor="let task of dayTasks" 
                 (click)="onTaskClick(task)"
                 class="p-3 bg-white border border-gray-200 rounded shadow-sm hover:shadow cursor-pointer flex justify-between items-center bg-l-4"
                 [class.border-l-4-blue-500]="task.status === 'todo'"
                 [class.border-l-4-yellow-500]="task.status === 'in_progress'"
                 [class.border-l-4-green-500]="task.status === 'done'">
                 <div>
                    <div class="font-medium text-gray-900">{{ task.title }}</div>
                    <div class="text-xs text-gray-500 flex gap-2 mt-1">
                        <span *ngIf="task.due_date">Due: {{ task.due_date | date:'shortTime' }}</span>
                        <span class="capitalize px-1.5 py-0.5 rounded bg-gray-100">{{ task.status.replace('_', ' ') }}</span>
                    </div>
                 </div>
                 <div *ngIf="task.assignee" class="flex items-center">
                    <div class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs" title="{{ task.assignee.name }}">
                        {{ task.assignee.name.charAt(0) }}
                    </div>
                 </div>
            </div>
            <div *ngIf="dayTasks.length === 0" class="text-center text-gray-500 mt-10">
                No tasks for this day.
            </div>
        </div>
      </div>
    `,
    styles: [`:host { display: block; height: 100%; }`]
})
export class CalendarDayComponent implements OnChanges {
    @Input() tasks: Task[] = [];
    @Input() viewDate: Date = new Date();
    @Input() dateDisplayMode: 'due_date' | 'start_date' = 'due_date';
    @Output() taskClick = new EventEmitter<Task>();

    dayTasks: Task[] = [];

    ngOnChanges(changes: SimpleChanges) {
        if (changes['tasks'] || changes['viewDate'] || changes['dateDisplayMode']) {
            this.updateDayTasks();
        }
    }

    updateDayTasks() {
        const startOfDay = new Date(this.viewDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(this.viewDate);
        endOfDay.setHours(23, 59, 59, 999);

        this.dayTasks = this.tasks.filter(task => {
            const dateStr = this.dateDisplayMode === 'start_date' ? task.start_date : task.due_date;
            if (!dateStr) return false;

            const taskDate = new Date(dateStr);
            return taskDate >= startOfDay && taskDate <= endOfDay;
        });
    }

    onTaskClick(task: Task) {
        this.taskClick.emit(task);
    }
}
