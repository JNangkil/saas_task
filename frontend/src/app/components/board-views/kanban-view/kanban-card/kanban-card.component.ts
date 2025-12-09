import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../../../models/task.model';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white p-3 rounded shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
      <div class="text-sm font-medium text-gray-900 mb-1">{{ task?.title }}</div>
      <div class="flex items-center justify-between mt-2">
        <div class="flex items-center space-x-2">
          <!-- Priority indicator -->
          <div 
             [class.bg-red-100]="task?.priority === 'high'" 
             [class.text-red-700]="task?.priority === 'high'"
             [class.bg-yellow-100]="task?.priority === 'medium'"
             [class.text-yellow-700]="task?.priority === 'medium'"
             [class.bg-green-100]="task?.priority === 'low'"
             [class.text-green-700]="task?.priority === 'low'"
             class="text-xs px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
             {{ task?.priority || 'none' }}
          </div>
        </div>
        
        <!-- Due date -->
        <div *ngIf="task?.due_date" class="text-xs text-gray-500">
          {{ task?.due_date | date:'MMM d' }}
        </div>
      </div>
    </div>
  `
})
export class KanbanCardComponent {
  @Input() task: Task | undefined;
}
