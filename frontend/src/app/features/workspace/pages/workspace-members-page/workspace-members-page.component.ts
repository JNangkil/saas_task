import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { WorkspaceStoreService } from '../../services/workspace-store.service';

type SuggestedInvite = {
  name: string;
  role: 'Owner' | 'Admin' | 'Member';
  reason: string;
};

@Component({
  selector: 'tf-workspace-members-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workspace-members-page.component.html',
  styleUrls: ['./workspace-members-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceMembersPageComponent {
  private readonly workspaceStore = inject(WorkspaceStoreService);
  protected readonly activeWorkspace = toSignal(this.workspaceStore.observeWorkspace(), {
    initialValue: null
  });

  protected readonly suggestedInvites = computed<SuggestedInvite[]>(() => {
    const workspace = this.activeWorkspace();

    if (!workspace) {
      return [];
    }

    return [
      {
        name: 'Product manager',
        role: 'Owner',
        reason: `Keeps ${workspace.name} aligned with company goals and roadmaps.`
      },
      {
        name: 'Engineering lead',
        role: 'Admin',
        reason: 'Triages requests and manages project health dashboards.'
      },
      {
        name: 'Delivery analyst',
        role: 'Member',
        reason: 'Tracks metrics and reports blockers to stakeholders.'
      }
    ];
  });
}
