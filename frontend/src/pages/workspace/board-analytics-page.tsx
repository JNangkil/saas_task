import { useParams } from 'react-router';
import { useBoard } from '@/services/board.service';
import { useTasks } from '@/services/task.service';
import { useAuth } from '@/auth/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function BoardAnalyticsPage() {
  const { workspaceId, boardId } = useParams<{ workspaceId: string; boardId: string }>();
  const { user } = useAuth();
  const { data: board, isLoading } = useBoard(workspaceId!, boardId!, user?.current_tenant_id);
  const { data: tasksData } = useTasks(workspaceId!, boardId!);

  const tasks = tasksData?.data || [];
  
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending' || !t.status).length;
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date() && t.status !== 'completed';
  }).length;

  const stats = [
    {
      title: 'Total Tasks',
      value: tasks.length,
      icon: CheckCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Completed',
      value: completedTasks,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Pending',
      value: pendingTasks,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Overdue',
      value: overdueTasks,
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your board performance</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Completion Rate</CardTitle>
          <CardDescription>
            {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}% of tasks completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-4">
            <div
              className="bg-primary h-4 rounded-full transition-all"
              style={{
                width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%`
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates on your board</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Detailed analytics coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
