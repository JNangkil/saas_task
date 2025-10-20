export interface WorkspaceStructure {
  workspaceName: string;
  spaces: WorkspaceStructureSpace[];
}

export interface WorkspaceStructureSpace {
  id: string;
  name: string;
  description: string;
  folders: WorkspaceStructureFolder[];
}

export interface WorkspaceStructureFolder {
  id: string;
  name: string;
  description: string;
  lists: WorkspaceStructureList[];
}

export interface WorkspaceStructureList {
  id: string;
  name: string;
  description: string;
  tasks: WorkspaceStructureTask[];
}

export interface WorkspaceStructureTask {
  id: string;
  title: string;
  status: 'Backlog' | 'Active' | 'Review' | 'Complete';
  assignee: string;
  due: string;
}
