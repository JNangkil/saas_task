import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TenantService } from '../../services/tenant.service';
import { AnalyticsService, DashboardStats as AnalyticsDashboardStats } from '../../services/analytics.service';

interface DashboardStats {
    totalWorkspaces: number;
    totalBoards: number;
    totalTasks: number;
    activeUsers: number;
    tasksCompletedThisWeek: number;
    tasksInProgress: number;
}

interface RecentActivity {
    id: number;
    type: 'task_created' | 'task_completed' | 'member_joined' | 'workspace_created';
    description: string;
    user: string;
    timestamp: Date;
}

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './admin-dashboard.component.html',
    styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
    stats: DashboardStats = {
        totalWorkspaces: 0,
        totalBoards: 0,
        totalTasks: 0,
        activeUsers: 0,
        tasksCompletedThisWeek: 0,
        tasksInProgress: 0
    };

    recentActivity: RecentActivity[] = [];
    isLoading = true;

    quickActions = [
        { icon: 'add', label: 'Create Workspace', route: '/workspaces/create', color: 'primary' },
        { icon: 'person_add', label: 'Invite Member', route: '/users', color: 'accent' },
        { icon: 'settings', label: 'Team Settings', route: '/dashboard/settings', color: 'secondary' },
        { icon: 'analytics', label: 'View Analytics', route: '/dashboard/analytics', color: 'info' }
    ];

    constructor(
        private tenantService: TenantService,
        private analyticsService: AnalyticsService
    ) { }

    ngOnInit(): void {
        this.loadDashboardData();
    }

    private loadDashboardData(): void {
        this.isLoading = true;

        // Load analytics data
        this.analyticsService.getDashboardStats().subscribe({
            next: (data: AnalyticsDashboardStats) => {
                this.stats = {
                    totalWorkspaces: data.workspaces_count || 0,
                    totalBoards: data.boards_count || 0,
                    totalTasks: data.tasks_count || 0,
                    activeUsers: data.active_users_count || 0,
                    tasksCompletedThisWeek: data.tasks_completed_this_week || 0,
                    tasksInProgress: data.tasks_in_progress || 0
                };
                this.isLoading = false;
            },
            error: (error: Error) => {
                console.error('Failed to load dashboard stats:', error);
                // Set mock data for display
                this.stats = {
                    totalWorkspaces: 5,
                    totalBoards: 12,
                    totalTasks: 156,
                    activeUsers: 8,
                    tasksCompletedThisWeek: 23,
                    tasksInProgress: 45
                };
                this.isLoading = false;
            }
        });

        // Mock recent activity
        this.recentActivity = [
            {
                id: 1,
                type: 'task_completed',
                description: 'Completed "Update documentation"',
                user: 'Sarah Johnson',
                timestamp: new Date(Date.now() - 1000 * 60 * 15)
            },
            {
                id: 2,
                type: 'member_joined',
                description: 'Joined the team',
                user: 'Mike Chen',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
            },
            {
                id: 3,
                type: 'workspace_created',
                description: 'Created workspace "Q1 Planning"',
                user: 'Emily Rodriguez',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5)
            },
            {
                id: 4,
                type: 'task_created',
                description: 'Created task "Design review meeting"',
                user: 'Alex Kim',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8)
            }
        ];
    }

    getActivityIcon(type: string): string {
        const icons: Record<string, string> = {
            'task_created': 'add_task',
            'task_completed': 'task_alt',
            'member_joined': 'person_add',
            'workspace_created': 'folder'
        };
        return icons[type] || 'info';
    }

    getTimeAgo(date: Date): string {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
}
