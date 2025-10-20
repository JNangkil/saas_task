import { Injectable, computed, signal } from '@angular/core';

import {
  WorkspaceStructure,
  WorkspaceStructureFolder,
  WorkspaceStructureList,
  WorkspaceStructureSpace,
  WorkspaceStructureTask
} from '../models/workspace-structure.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceStructureService {
  private readonly structureSignal = signal<WorkspaceStructure>(this.createInitialStructure());

  readonly structure = computed(() => this.structureSignal());

  setWorkspaceName(name: string): void {
    const normalized = name.trim() || 'Workspace';
    this.structureSignal.update(current => ({
      ...current,
      workspaceName: normalized
    }));
  }

  addSpace(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const space: WorkspaceStructureSpace = {
      id: this.generateId('space'),
      name: trimmed,
      description: 'Spaces mirror departments or programs. Customize this space to track a new initiative.',
      folders: []
    };

    this.structureSignal.update(current => ({
      ...current,
      spaces: [...current.spaces, space]
    }));
  }

  addFolder(spaceId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const folder: WorkspaceStructureFolder = {
      id: this.generateId('folder'),
      name: trimmed,
      description: 'Folders collect related projects. Use them to group lists for this space.',
      lists: []
    };

    this.structureSignal.update(current => ({
      ...current,
      spaces: current.spaces.map(space =>
        space.id === spaceId
          ? {
              ...space,
              folders: [...space.folders, folder]
            }
          : space
      )
    }));
  }

  addList(spaceId: string, folderId: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }

    const list: WorkspaceStructureList = {
      id: this.generateId('list'),
      name: trimmed,
      description: 'Lists behave like projects or sprints. Add tasks here to plan the work.',
      tasks: []
    };

    this.structureSignal.update(current => ({
      ...current,
      spaces: current.spaces.map(space =>
        space.id === spaceId
          ? {
              ...space,
              folders: space.folders.map(folder =>
                folder.id === folderId
                  ? {
                      ...folder,
                      lists: [...folder.lists, list]
                    }
                  : folder
              )
            }
          : space
      )
    }));
  }

  addTask(spaceId: string, folderId: string, listId: string, title: string): void {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    const task: WorkspaceStructureTask = {
      id: this.generateId('task'),
      title: trimmed,
      status: 'Backlog',
      assignee: 'Unassigned',
      due: 'No due date'
    };

    this.structureSignal.update(current => ({
      ...current,
      spaces: current.spaces.map(space =>
        space.id === spaceId
          ? {
              ...space,
              folders: space.folders.map(folder =>
                folder.id === folderId
                  ? {
                      ...folder,
                      lists: folder.lists.map(list =>
                        list.id === listId
                          ? {
                              ...list,
                              tasks: [...list.tasks, task]
                            }
                          : list
                      )
                    }
                  : folder
              )
            }
          : space
      )
    }));
  }

  private createInitialStructure(): WorkspaceStructure {
    return {
      workspaceName: 'Lawis Tech',
      spaces: [
        {
          id: this.generateId('space'),
          name: 'Client Work',
          description: 'Spaces mirror departments or client programs. Everything inside stays scoped to that team.',
          folders: [
            {
              id: this.generateId('folder'),
              name: 'Website Redesign',
              description: 'Folders collect related projects. This one keeps every website deliverable together.',
              lists: [
                {
                  id: this.generateId('list'),
                  name: 'Homepage Project',
                  description: 'Lists behave like projects or sprints. They hold all tasks for this initiative.',
                  tasks: [
                    {
                      id: this.generateId('task'),
                      title: 'Design wireframe',
                      status: 'Active',
                      assignee: 'Morgan Lee',
                      due: 'Due today'
                    },
                    {
                      id: this.generateId('task'),
                      title: 'Write homepage copy',
                      status: 'Review',
                      assignee: 'Jordan Blake',
                      due: 'Due tomorrow'
                    },
                    {
                      id: this.generateId('task'),
                      title: 'Develop hero section',
                      status: 'Backlog',
                      assignee: 'Taylor Swift',
                      due: 'Due Friday'
                    }
                  ]
                },
                {
                  id: this.generateId('list'),
                  name: 'Launch Campaign',
                  description: 'Another list in the same folder can track supporting assets for launch.',
                  tasks: [
                    {
                      id: this.generateId('task'),
                      title: 'Draft announcement email',
                      status: 'Active',
                      assignee: 'Avery Chen',
                      due: 'Due next week'
                    },
                    {
                      id: this.generateId('task'),
                      title: 'QA landing page',
                      status: 'Review',
                      assignee: 'Morgan Lee',
                      due: 'Due next week'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          id: this.generateId('space'),
          name: 'Internal Ops',
          description: 'Spaces can also power internal programs so cross-functional teams stay aligned.',
          folders: [
            {
              id: this.generateId('folder'),
              name: 'Team Rituals',
              description: 'Use folders to separate recurring work like meetings or retrospectives.',
              lists: [
                {
                  id: this.generateId('list'),
                  name: 'Weekly Sync Agenda',
                  description: 'Lists keep the running log of agendas and follow-ups.',
                  tasks: [
                    {
                      id: this.generateId('task'),
                      title: 'Prep talking points',
                      status: 'Backlog',
                      assignee: 'Jordan Blake',
                      due: 'Due Monday'
                    },
                    {
                      id: this.generateId('task'),
                      title: 'Collect metrics snapshot',
                      status: 'Active',
                      assignee: 'Taylor Swift',
                      due: 'Due Monday'
                    },
                    {
                      id: this.generateId('task'),
                      title: 'Share meeting recording',
                      status: 'Complete',
                      assignee: 'Morgan Lee',
                      due: 'Completed yesterday'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
  }

  private generateId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 8);
    const timestamp = Date.now().toString(36);
    return `${prefix}_${timestamp}_${random}`;
  }
}
