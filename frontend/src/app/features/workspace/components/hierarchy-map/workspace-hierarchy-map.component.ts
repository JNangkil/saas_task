import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { WorkspaceHierarchy } from '../../models/workspace-hierarchy.model';

@Component({
  selector: 'tf-workspace-hierarchy-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workspace-hierarchy-map.component.html',
  styleUrls: ['./workspace-hierarchy-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceHierarchyMapComponent {
  @Input({ required: true }) hierarchy!: WorkspaceHierarchy;

  trackByIndex(index: number): number {
    return index;
  }
}
