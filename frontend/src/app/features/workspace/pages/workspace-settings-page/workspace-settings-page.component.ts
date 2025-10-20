import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import {
  WorkspaceFormValue,
  WorkspaceSettingsFormComponent
} from '../../components/workspace-settings-form/workspace-settings-form.component';
import { WorkspaceApiService } from '../../services/workspace-api.service';
import { WorkspaceStoreService } from '../../services/workspace-store.service';

@Component({
  selector: 'tf-workspace-settings-page',
  standalone: true,
  imports: [CommonModule, WorkspaceSettingsFormComponent],
  templateUrl: './workspace-settings-page.component.html',
  styleUrls: ['./workspace-settings-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceSettingsPageComponent {
  private readonly workspaceStore = inject(WorkspaceStoreService);
  private readonly workspaceApi = inject(WorkspaceApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeWorkspace = toSignal(this.workspaceStore.observeWorkspace(), {
    initialValue: null
  });
  protected readonly isSaving = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly submitError = signal<string | null>(null);

  protected handleSave(payload: WorkspaceFormValue): void {
    const workspace = this.activeWorkspace();

    if (!workspace || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.submitError.set(null);
    this.statusMessage.set(null);

    this.workspaceApi
      .updateWorkspace(workspace.id, payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: updatedWorkspace => {
          this.workspaceStore.updateWorkspace(updatedWorkspace);
          this.statusMessage.set('Workspace settings saved.');
        },
        error: error => {
          this.submitError.set(this.extractErrorMessage(error, 'Unable to save workspace.'));
        }
      });
  }

  protected handleDelete(): void {
    const workspace = this.activeWorkspace();

    if (!workspace || this.isDeleting()) {
      return;
    }

    const confirmFn =
      typeof globalThis !== 'undefined' &&
      typeof (globalThis as { confirm?: (message?: string) => boolean }).confirm === 'function'
        ? (globalThis as { confirm: (message?: string) => boolean }).confirm
        : undefined;

    if (confirmFn && !confirmFn(`Delete workspace "${workspace.name}"? This cannot be undone.`)) {
      return;
    }

    this.isDeleting.set(true);
    this.submitError.set(null);
    this.statusMessage.set(null);

    this.workspaceApi
      .deleteWorkspace(workspace.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDeleting.set(false))
      )
      .subscribe({
        next: () => {
          this.workspaceStore.removeWorkspace(workspace.id);
          this.statusMessage.set(`Workspace "${workspace.name}" deleted.`);

          const nextActiveId = this.workspaceStore.getActiveWorkspaceId();

          if (nextActiveId) {
            void this.router.navigate(['/workspace', nextActiveId, 'overview']);
            return;
          }

          void this.router.navigate(['/workspace']);
        },
        error: error => {
          this.submitError.set(this.extractErrorMessage(error, 'Unable to delete workspace.'));
        }
      });
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim().length > 0) {
        return error.error;
      }

      if (error.error && typeof error.error === 'object' && 'message' in error.error) {
        const apiError = error.error as Record<string, unknown>;
        const message = apiError['message'];
        if (typeof message === 'string') {
          return message || fallback;
        }
      }
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const candidate = (error as { message?: unknown }).message;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }

    return fallback;
  }
}
