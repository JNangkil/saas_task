
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface Task {
  id: string;
  name: string;
  completed: boolean;
}

@Component({
  selector: 'tf-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListComponent {
  @Input() tasks: Task[] = [];

  trackByTaskId(_index: number, task: Task): string {
    return task.id;
  }
}
