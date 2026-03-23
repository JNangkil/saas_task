import { useParams } from 'react-router';
import { useBoard } from '@/services/board.service';
import { useAuth } from '@/auth/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function BoardTeamPage() {
  const { workspaceId, boardId } = useParams<{ workspaceId: string; boardId: string }>();
  const { user } = useAuth();
  const { data: board, isLoading } = useBoard(workspaceId!, boardId!, user?.current_tenant_id);

  const mockMembers = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Owner' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Admin' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Member' },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">Manage team members for {board?.name}</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            People with access to this board
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground px-3 py-1 bg-muted rounded-full">
                    {member.role}
                  </span>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
