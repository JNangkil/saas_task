import { useParams, Link } from 'react-router';
import { useBoard, useTasks } from '@/services/board.service';
import { useTasks as useTaskService, useCreateTask, useUpdateTaskPosition } from '@/services/task.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { ArrowLeft, Plus, Settings } from 'lucide-react';
import { Kanban } from '@/components/ui/kanban';

export function BoardDetailPage() {
  const { workspaceId, boardId } = useParams<{ workspaceId: string; boardId: string }>();
  const { data: board, isLoading: boardLoading } = useBoard(workspaceId || '', boardId || '');
  const { data: tasksData, isLoading: tasksLoading } = useTaskService(
    workspaceId || '',
    parseInt(boardId || '0')
  );
  const createTask = useCreateTask();
  const updateTaskPosition = useUpdateTaskPosition();

  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
  });

  if (!workspaceId || !boardId) {
    return <div className="flex items-center justify-center h-screen">Board not found</div>;
  }

  if (boardLoading || tasksLoading) {
    return <div className="flex items-center justify-center h-screen">Loading board...</div>;
  }

  if (!board) {
    return <div className="flex items-center justify-center h-screen">Board not found</div>;
  }

  const handleCreateTask = async () => {
    try {
      await createTask.mutateAsync({
        workspaceId: parseInt(workspaceId),
        boardId: parseInt(boardId),
        data: {
          title: newTask.title,
          description: newTask.description,
        },
      });
      setIsCreateTaskDialogOpen(false);
      setNewTask({ title: '', description: '' });
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleTaskDrop = async (taskId: number, newPosition: number, newColumnId?: number) => {
    try {
      await updateTaskPosition.mutateAsync({
        workspaceId: parseInt(workspaceId),
        taskId,
        position: newPosition,
        columnId: newColumnId,
      });
    } catch (error) {
      console.error('Failed to update task position:', error);
    }
  };

  const tasks = tasksData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/${workspaceId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: board.color + '20' }}
            >
              {board.icon || '📋'}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{board.name}</h1>
              {board.description && (
                <p className="text-muted-foreground">{board.description}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="capitalize">
            {board.type}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Create a new task in this board.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea
                    id="task-description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Task description"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateTask}
                  disabled={createTask.isPending || !newTask.title}
                >
                  {createTask.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" asChild>
            <Link to={`/app/${workspaceId}/boards/${boardId}/settings`}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {board.type === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {['To Do', 'In Progress', 'Review', 'Done'].map((column, colIndex) => (
            <Card key={column} className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {column}
                  <Badge variant="secondary" className="text-xs">
                    {tasks.filter((t) => t.status === column.toLowerCase().replace(' ', '_')).length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tasks
                  .filter((t) => t.status === column.toLowerCase().replace(' ', '_'))
                  .map((task) => (
                    <Card
                      key={task.id}
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                      draggable
                      onDragEnd={(e) => {
                        // Handle drag and drop here
                        // This is a simplified version - you'd need full dnd-kit implementation
                      }}
                    >
                      <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </Card>
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks.map((task) => (
                <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      {task.status && (
                        <Badge variant="outline" className="mt-2 capitalize">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tasks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold mb-2">No tasks yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first task to get started.
            </p>
            <Button onClick={() => setIsCreateTaskDialogOpen(true)}>Create Task</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
