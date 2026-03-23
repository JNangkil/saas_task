import { useParams, Link } from 'react-router';
import { useBoards, useCreateBoard, useArchiveBoard, useRestoreBoard, useFavoriteBoard, useUnfavoriteBoard } from '@/services/board.service';
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
import { Star, Archive, RotateCcw } from 'lucide-react';

export function BoardListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: boards, isLoading, error } = useBoards(workspaceId || '');
  const createBoard = useCreateBoard();
  const archiveBoard = useArchiveBoard();
  const restoreBoard = useRestoreBoard();
  const favoriteBoard = useFavoriteBoard();
  const unfavoriteBoard = useUnfavoriteBoard();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newBoard, setNewBoard] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: '📋',
    type: 'kanban' as const,
  });

  if (!workspaceId) {
    return <div className="flex items-center justify-center h-screen">Workspace not found</div>;
  }

  const handleCreateBoard = async () => {
    if (!workspaceId) return;
    
    try {
      await createBoard.mutateAsync({
        workspaceId: parseInt(workspaceId),
        data: newBoard,
      });
      setIsCreateDialogOpen(false);
      setNewBoard({ name: '', description: '', color: '#3b82f6', icon: '📋', type: 'kanban' });
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  const handleToggleArchive = async (boardId: number, isArchived: boolean) => {
    if (!workspaceId) return;

    try {
      if (isArchived) {
        await restoreBoard.mutateAsync({ workspaceId: parseInt(workspaceId), boardId });
      } else {
        await archiveBoard.mutateAsync({ workspaceId: parseInt(workspaceId), boardId });
      }
    } catch (error) {
      console.error('Failed to toggle archive:', error);
    }
  };

  const handleToggleFavorite = async (boardId: number, isFavorite: boolean) => {
    if (!workspaceId) return;

    try {
      if (isFavorite) {
        await unfavoriteBoard.mutateAsync({ workspaceId: parseInt(workspaceId), boardId });
      } else {
        await favoriteBoard.mutateAsync({ workspaceId: parseInt(workspaceId), boardId });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading boards...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">Failed to load boards</div>;
  }

  const filteredBoards = boards?.filter((board) => showArchived || !board.is_archived) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Boards</h1>
          <p className="text-muted-foreground">Manage your boards</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? 'Hide' : 'Show'} Archived
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create Board</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Board</DialogTitle>
                <DialogDescription>
                  Create a new board to organize your tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newBoard.name}
                    onChange={(e) => setNewBoard({ ...newBoard, name: e.target.value })}
                    placeholder="My Board"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newBoard.description}
                    onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                    placeholder="A brief description of your board"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateBoard}
                  disabled={createBoard.isPending || !newBoard.name}
                >
                  {createBoard.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredBoards.map((board) => (
          <Card
            key={board.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            style={{ borderTop: `4px solid ${board.color}` }}
          >
            <Link to={`/app/${workspaceId}/boards/${board.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: board.color + '20' }}
                    >
                      {board.icon || '📋'}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{board.name}</CardTitle>
                      {board.description && (
                        <CardDescription className="text-sm">{board.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleFavorite(board.id, !!board.is_favorite);
                    }}
                  >
                    <Star
                      className={`h-4 w-4 ${board.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`}
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{board.type}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleArchive(board.id, board.is_archived);
                    }}
                  >
                    {board.is_archived ? (
                      <RotateCcw className="h-4 w-4 text-green-500" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      {filteredBoards.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">No boards yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              {showArchived
                ? 'No archived boards found.'
                : 'Create your first board to get started with organizing your tasks.'}
            </p>
            {!showArchived && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>Create Board</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
