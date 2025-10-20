
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface Project {
  id: string;
  name: string;
  description: string;
}

@Component({
  selector: 'tf-project-list',
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectListComponent {
  @Input() projects: Project[] = [];
  @Output() projectSelected = new EventEmitter<Project>();

  trackByProjectId(_index: number, project: Project): string {
    return project.id;
  }

  selectProject(project: Project): void {
    this.projectSelected.emit(project);
  }
}
