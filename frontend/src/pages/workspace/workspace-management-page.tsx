import { useParams } from 'react-router';
import { useWorkspaces, useCreateWorkspace, useDeleteWorkspace, useUpdateWorkspace } from '@/services/workspace.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

export function WorkspaceManagementPage() {
  const { data: workspaces, isLoading, error } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '', color: '#3b82f6', icon: '📊' });

  const handleCreateWorkspace = async () => {
    try {
      await createWorkspace.mutateAsync(newWorkspace);
      setIsCreateDialogOpen(false);
      setNewWorkspace({ name: '', description: '', color: '#3b82f6', icon: '📊' });
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const handleDeleteWorkspace = async (id: number) => {
    if (confirm('Are you sure you want to delete this workspace?')) {
      try {
        await deleteWorkspace.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete workspace:', error);
      }
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading workspaces...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">Failed to load workspaces</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workspace Management</h1>
          <p className="text-muted-foreground">Manage your workspaces</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create Workspace</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Create a new workspace to organize your boards and tasks.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  placeholder="My Workspace"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newWorkspace.description}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, description: e.target.value })}
                  placeholder="A brief description of your workspace"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateWorkspace}
                disabled={createWorkspace.isPending || !newWorkspace.name}
              >
                {createWorkspace.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workspaces?.map((workspace) => (
          <Card key={workspace.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: workspace.color + '20' }}
                  >
                    {workspace.icon || '📊'}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{workspace.name}</CardTitle>
                    {workspace.description && (
                      <CardDescription className="text-sm">{workspace.description}</CardDescription>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/app/${workspace.id}`}>Open</a>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteWorkspace(workspace.id)}
                  disabled={deleteWorkspace.isPending}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workspaces?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold mb-2">No workspaces yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first workspace to get started with organizing your tasks and boards.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>Create Workspace</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
