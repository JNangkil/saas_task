import { useAuth } from '@/auth/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useState, Fragment } from 'react';
import { useWorkspaces, useCreateWorkspace } from '@/services/workspace.service';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarActions, ToolbarHeading } from '@/layouts/demo1/components/toolbar';
import { Plus } from 'lucide-react';
import { Statistics, Users, FeaturesHighlight, Activities, WorkspaceGrid } from './components';
import { toAbsoluteUrl } from '@/lib/helpers';

export function WorkspaceManagementPage() {
  const { user } = useAuth();
  const createWorkspace = useCreateWorkspace();
  const { data: workspaces } = useWorkspaces();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '', color: '#3b82f6', icon: '📊' });

  const handleCreateWorkspace = async () => {
    if (!user?.current_tenant_id) {
      console.error('No tenant ID found');
      return;
    }

    try {
      await createWorkspace.mutateAsync({
        tenantId: user.current_tenant_id,
        data: newWorkspace,
      });
      setIsCreateDialogOpen(false);
      setNewWorkspace({ name: '', description: '', color: '#3b82f6', icon: '📊' });
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Workspaces"
            description="Manage your projects and organizational workspaces"
          />
          <ToolbarActions>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Workspace
                </Button>
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
          </ToolbarActions>
        </Toolbar>
      </Container>
      <Container>
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-7.5">
            <div className="col-span-1">
              <div className="grid gap-5 lg:gap-7.5 h-full">
                <Statistics 
                  data={[
                    { title: 'Workspaces', value: workspaces?.length || 0 },
                    { title: 'Active Boards', value: 12 }
                  ]} 
                />
                <Users 
                  title="Active Members" 
                  items={[
                    { image: '300-1.png' },
                    { image: '300-2.png' },
                    { image: '300-3.png' },
                    { image: '300-5.png' },
                    { image: '300-6.png' }
                  ]} 
                />
              </div>
            </div>
            
            <div className="col-span-2">
              <FeaturesHighlight
                image={
                  <Fragment>
                    <img
                      src={toAbsoluteUrl('/media/illustrations/18.svg')}
                      className="dark:hidden max-h-[200px]"
                      alt="image"
                    />
                    <img
                      src={toAbsoluteUrl('/media/illustrations/18-dark.svg')}
                      className="light:hidden max-h-[200px]"
                      alt="image"
                    />
                  </Fragment>
                }
                title={
                  <>
                    Centralize Your <br /> Organization Work
                  </>
                }
                description="Manage teams, projects, and resources seamlessly in one unified interface."
                more={{ title: 'Explore Features', url: '#' }}
                features={[
                  ['Cross-Workspace Sync', 'Advanced Analytics'],
                  ['Granular Permissions', 'Secure Access'],
                ]}
              />
            </div>
          </div>

          {workspaces && workspaces.length > 0 ? (
            <WorkspaceGrid workspaces={workspaces} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="text-6xl mb-6">📭</div>
                <h3 className="text-xl font-semibold mb-3">No workspaces yet</h3>
                <p className="text-muted-foreground text-center mb-8 max-w-md">
                  Get started by creating your first workspace. Workspaces help you organize your boards, tasks, and team members in one place.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workspace
                </Button>
              </CardContent>
            </Card>
          )}

          <Activities />
        </div>
      </Container>
    </Fragment>
  );
}
