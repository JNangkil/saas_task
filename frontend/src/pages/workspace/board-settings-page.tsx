import { useParams } from 'react-router';
import { useBoard, useUpdateBoard } from '@/services/board.service';
import { useAuth } from '@/auth/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function BoardSettingsPage() {
  const { workspaceId, boardId } = useParams<{ workspaceId: string; boardId: string }>();
  const { user } = useAuth();
  const { data: board, isLoading, error } = useBoard(workspaceId!, boardId!, user?.current_tenant_id);
  const updateBoard = useUpdateBoard();
  
  const [formData, setFormData] = useState({
    name: board?.name || '',
    description: board?.description || '',
    color: board?.color || '#3b82f6',
    icon: board?.icon || '📊',
  });

  const handleSave = async () => {
    if (!user?.current_tenant_id) {
      console.error('No tenant ID found');
      return;
    }

    try {
      await updateBoard.mutateAsync({
        tenantId: user.current_tenant_id,
        workspaceId: Number(workspaceId),
        boardId: Number(boardId),
        data: formData,
      });
    } catch (error) {
      console.error('Failed to update board:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">Failed to load board</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Board Settings</h1>
        <p className="text-muted-foreground">Manage your board settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Board Information</CardTitle>
          <CardDescription>Update your board details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={board?.name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={board?.description || 'A brief description of your board'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-20 h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Input
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="📊"
              className="w-20"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={updateBoard.isPending}
          >
            {updateBoard.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
