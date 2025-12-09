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
    <div class="w-80 flex-shrink-0 bg-gray-100 rounded-lg flex flex-col max-h-full">
      <div class="p-3 font-semibold text-gray-700 flex justify-between items-center header-handle cursor-move">
        <span>{{ column?.title }}</span>
        <span class="text-sm text-gray-400 font-normal">{{ column?.tasks?.length }}</span>
      </div>
      
      <div
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
  `]
})
export class KanbanColumnComponent {
  @Input() column: any;
  @Output() taskDropped = new EventEmitter<CdkDragDrop<Task[]>>();

  onDrop(event: CdkDragDrop<Task[]>) {
    this.taskDropped.emit(event);
  }
}
