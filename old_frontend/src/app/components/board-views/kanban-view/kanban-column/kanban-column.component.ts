import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Task } from '../../../../models/task.model';
import { KanbanCardComponent } from '../kanban-card/kanban-card.component';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [CommonModule, DragDropModule, KanbanCardComponent],
  template: `
    <div [class.w-80]="!isCollapsed" [class.w-12]="isCollapsed" class="flex-shrink-0 bg-gray-100 rounded-lg flex flex-col max-h-full transition-all duration-300">
      <div 
        (click)="toggle()"
        class="p-3 font-semibold text-gray-700 flex justify-between items-center header-handle cursor-pointer hover:bg-gray-200 rounded-t-lg"
        [class.flex-col]="isCollapsed"
        [class.h-full]="isCollapsed"
        [class.justify-start]="isCollapsed"
        [class.py-4]="isCollapsed">
        
        <!-- Expanded Header -->
        <ng-container *ngIf="!isCollapsed">
          <span>{{ column?.title }}</span>
          <div class="flex items-center space-x-2">
             <span class="text-sm text-gray-400 font-normal">{{ column?.tasks?.length }}</span>
             <button class="text-gray-400 hover:text-gray-600">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
               </svg>
             </button>
          </div>
        </ng-container>

        <!-- Collapsed Header -->
        <ng-container *ngIf="isCollapsed">
            <span class="text-xs font-bold text-gray-500 mb-4">{{ column?.tasks?.length }}</span>
            <span class="writing-mode-vertical text-sm font-medium tracking-wide whitespace-nowrap">{{ column?.title }}</span>
            <button class="mt-auto text-gray-400 hover:text-gray-600">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
               </svg>
            </button>
        </ng-container>
      </div>
      
      <div
        *ngIf="!isCollapsed"
        cdkDropList
        [id]="column?.id"
        [cdkDropListData]="column?.tasks"
        class="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]"
        (cdkDropListDropped)="onDrop($event)">
        
        <app-kanban-card
          *ngFor="let task of column?.tasks"
          [task]="task"
          cdkDrag
          [cdkDragData]="task">
          <div *cdkDragPlaceholder class="custom-placeholder bg-gray-200 border-dashed border-2 border-gray-400 rounded-lg h-20 w-full mb-2"></div>
        </app-kanban-card>
        
      </div>
    </div>
  `,
  styles: [`
    .custom-placeholder {
      opacity: 0.5;
    }
    .writing-mode-vertical {
        writing-mode: vertical-rl;
        text-orientation: mixed;
    }
  `]
})
export class KanbanColumnComponent {
  @Input() column: any;
  @Input() isCollapsed: boolean = false;
  @Output() taskDropped = new EventEmitter<CdkDragDrop<Task[]>>();
  @Output() toggleCollapse = new EventEmitter<void>();

  onDrop(event: CdkDragDrop<Task[]>) {
    this.taskDropped.emit(event);
  }

  toggle() {
    this.toggleCollapse.emit();
  }
}
