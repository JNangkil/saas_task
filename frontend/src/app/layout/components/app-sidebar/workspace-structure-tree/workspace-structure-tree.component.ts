import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  WritableSignal,
  effect,
  inject,
  signal
} from '@angular/core';

import { WorkspaceStructureService } from '../../../../features/workspace/services/workspace-structure.service';
import {
  WorkspaceStructureFolder,
  WorkspaceStructureList,
  WorkspaceStructureSpace,
  WorkspaceStructureTask
} from '../../../../features/workspace/models/workspace-structure.model';

@Component({
  selector: 'tf-workspace-structure-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workspace-structure-tree.component.html',
  styleUrls: ['./workspace-structure-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceStructureTreeComponent {
  private readonly workspaceStructure = inject(WorkspaceStructureService);

  protected readonly structure = this.workspaceStructure.structure;

  private readonly collapsedSpaces = signal<Set<string>>(new Set());
  private readonly collapsedFolders = signal<Set<string>>(new Set());
  private readonly collapsedLists = signal<Set<string>>(new Set());

  protected readonly hasSpaces = signal(false);

  constructor() {
    effect(
      () => {
        const structure = this.structure();
        this.hasSpaces.set(structure.spaces.length > 0);
      },
      { allowSignalWrites: true }
    );
  }

  protected toggleSpace(space: WorkspaceStructureSpace): void {
    this.toggleCollapsed(this.collapsedSpaces, space.id);
  }

  protected toggleFolder(folder: WorkspaceStructureFolder): void {
    this.toggleCollapsed(this.collapsedFolders, folder.id);
  }

  protected toggleList(list: WorkspaceStructureList): void {
    this.toggleCollapsed(this.collapsedLists, list.id);
  }

  protected isSpaceCollapsed(spaceId: string): boolean {
    return this.collapsedSpaces().has(spaceId);
  }

  protected isFolderCollapsed(folderId: string): boolean {
    return this.collapsedFolders().has(folderId);
  }

  protected isListCollapsed(listId: string): boolean {
    return this.collapsedLists().has(listId);
  }

  protected handleAddSpace(): void {
    const name = this.promptForLabel('Name your new space');
    if (!name) {
      return;
    }

    this.workspaceStructure.addSpace(name);
  }

  protected handleAddFolder(space: WorkspaceStructureSpace): void {
    const name = this.promptForLabel(`Add a folder in ${space.name}`);
    if (!name) {
      return;
    }

    this.workspaceStructure.addFolder(space.id, name);
    this.collapsedSpaces.update(current => {
      const next = new Set(current);
      next.delete(space.id);
      return next;
    });
  }

  protected handleAddList(space: WorkspaceStructureSpace, folder: WorkspaceStructureFolder): void {
    const name = this.promptForLabel(`Add a list in ${folder.name}`);
    if (!name) {
      return;
    }

    this.workspaceStructure.addList(space.id, folder.id, name);
    this.collapsedFolders.update(current => {
      const next = new Set(current);
      next.delete(folder.id);
      this.collapsedSpaces.update(spaceSet => {
        const updated = new Set(spaceSet);
        updated.delete(space.id);
        return updated;
      });
      return next;
    });
  }

  protected handleAddTask(
    space: WorkspaceStructureSpace,
    folder: WorkspaceStructureFolder,
    list: WorkspaceStructureList
  ): void {
    const title = this.promptForLabel(`Add a task in ${list.name}`);
    if (!title) {
      return;
    }

    this.workspaceStructure.addTask(space.id, folder.id, list.id, title);
    this.collapsedLists.update(current => {
      const next = new Set(current);
      next.delete(list.id);
      this.collapsedFolders.update(folderSet => {
        const updatedFolders = new Set(folderSet);
        updatedFolders.delete(folder.id);
        return updatedFolders;
      });
      this.collapsedSpaces.update(spaceSet => {
        const updatedSpaces = new Set(spaceSet);
        updatedSpaces.delete(space.id);
        return updatedSpaces;
      });
      return next;
    });
  }

  protected trackBySpaceId(_index: number, space: WorkspaceStructureSpace): string {
    return space.id;
  }

  protected trackByFolderId(_index: number, folder: WorkspaceStructureFolder): string {
    return folder.id;
  }

  protected trackByListId(_index: number, list: WorkspaceStructureList): string {
    return list.id;
  }

  protected trackByTaskId(_index: number, task: WorkspaceStructureTask): string {
    return task.id;
  }

  private toggleCollapsed(target: WritableSignal<Set<string>>, id: string): void {
    target.update(current => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  private promptForLabel(message: string): string | null {
    const response = window.prompt(message, '');
    if (response === null) {
      return null;
    }

    const trimmed = response.trim();
    return trimmed.length ? trimmed : null;
  }
}
