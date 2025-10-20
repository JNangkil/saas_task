export interface WorkspaceHierarchy {
  workspaceName: string;
  spaces: WorkspaceHierarchySpace[];
}

export interface WorkspaceHierarchySpace {
  name: string;
  description: string;
  folders: WorkspaceHierarchyFolder[];
}

export interface WorkspaceHierarchyFolder {
  name: string;
  description: string;
  lists: WorkspaceHierarchyList[];
}

export interface WorkspaceHierarchyList {
  name: string;
  description: string;
  tasks: WorkspaceHierarchyTask[];
}

export interface WorkspaceHierarchyTask {
  title: string;
  status: 'Backlog' | 'Active' | 'Review' | 'Complete';
  assignee: string;
  due: string;
}
