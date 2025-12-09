import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task, User } from '../../../../models/task.model';
import { BoardStateService } from '../../../../services/board-state.service';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div (click)="onCardClick()" class="bg-white p-3 rounded shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer relative group">
      
      <!-- Quick Actions (visible on hover) -->
      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="text-gray-400 hover:text-gray-600 p-1">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>

      <!-- Labels -->
      <div class="flex flex-wrap gap-1 mb-2">
        <span *ngFor="let label of task?.labels" 
              [style.background-color]="label.color + '20'" 
              [style.color]="label.color"
              class="px-2 py-0.5 rounded text-[10px] font-medium border border-transparent">
          {{ label.name }}
        </span>
      </div>

      <div class="text-sm font-medium text-gray-900 mb-2 leading-snug pr-6">{{ task?.title }}</div>
      
      <div class="flex items-center justify-between mt-3">
        <div class="flex items-center space-x-2">
          <!-- Priority indicator -->
          <div *ngIf="task?.priority"
             [class.bg-red-100]="task?.priority === 'high' || task?.priority === 'urgent'" 
             [class.text-red-700]="task?.priority === 'high' || task?.priority === 'urgent'"
             [class.bg-yellow-100]="task?.priority === 'medium'"
             [class.text-yellow-700]="task?.priority === 'medium'"
             [class.bg-green-100]="task?.priority === 'low'"
             [class.text-green-700]="task?.priority === 'low'"
             class="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
             {{ task?.priority }}
          </div>
          
          <!-- Due date -->
          <div *ngIf="task?.due_date" 
               [class.text-red-600]="isOverdue(task?.due_date)"
               class="flex items-center text-xs text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ task?.due_date | date:'MMM d' }}
          </div>
        </div>

        <!-- Assignee Avatar -->
        <div *ngIf="task?.assignee" class="flex-shrink-0">
             <div class="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium border border-white shadow-sm"
                  [title]="task?.assignee?.name">
               {{ getUserInitials(task?.assignee) }}
             </div>
        </div>
      </div>
    </div>
  `
})
export class KanbanCardComponent {
  @Input() task: Task | undefined;

  constructor(private boardStateService: BoardStateService) { }

  onCardClick() {
    if (this.task) {
      this.boardStateService.selectTask(this.task);
    }
  }

  getUserInitials(user?: User): string {
    if (!user?.name) return '?';
    return user.name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  isOverdue(dateStr?: string): boolean {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only
    return date < today && this.task?.status !== 'done' && this.task?.status !== 'archived';
  }
}
