import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { Organization } from '../../../../shared/models/organization.model';

@Component({
  selector: 'tf-workspace-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workspace-switcher.component.html',
  styleUrls: ['./workspace-switcher.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceSwitcherComponent {
  @Input({ required: true }) workspaces: Organization[] = [];
  @Input() activeWorkspaceId: string | null = null;
  @Output() selectWorkspace = new EventEmitter<string>();
  @Output() createRequested = new EventEmitter<void>();

  protected trackByWorkspace = (_: number, workspace: Organization): string => workspace.id;

  protected handleSelect(workspaceId: string): void {
    if (workspaceId === this.activeWorkspaceId) {
      return;
    }

    this.selectWorkspace.emit(workspaceId);
  }

  protected handleCreateRequested(): void {
    this.createRequested.emit();
  }
}
