import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/guards/require-auth';
import { RequireAdmin } from '@/auth/guards/require-admin';
import { RequireSuperAdmin } from '@/auth/guards/require-super-admin';
import { Demo1Layout } from '@/layouts/demo1/layout';
import { BoardListPage } from '@/pages/workspace/board-list-page';
import { BoardDetailPage } from '@/pages/workspace/board-detail-page';
import { BoardSettingsPage } from '@/pages/workspace/board-settings-page';
import { BoardTeamPage } from '@/pages/workspace/board-team-page';
import { BoardAnalyticsPage } from '@/pages/workspace/board-analytics-page';
import { WorkspaceManagementPage } from '@/pages/workspace/workspace-management-page';
import { AdminDashboardPage } from '@/pages/admin/admin-dashboard-page';
import { Navigate, Route, Routes } from 'react-router';

export function AppRoutingSetup() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="auth/*" element={<AuthRouting />} />

      {/* Protected Routes */}
      <Route element={<RequireAuth />}>
        {/* Workspace and Board Routes */}
        <Route path="/app" element={<Demo1Layout />}>
          <Route index element={<Navigate to="/app/workspaces" replace />} />
          
          {/* Workspace Management */}
          <Route path="workspaces" element={<WorkspaceManagementPage />} />
          
          {/* Board List */}
          <Route path=":workspaceId" element={<BoardListPage />} />
          <Route path=":workspaceId/home" element={<BoardListPage />} />
          <Route path=":workspaceId/boards" element={<BoardListPage />} />
          
          {/* Board Detail & Settings */}
          <Route path=":workspaceId/boards/:boardId" element={<BoardDetailPage />} />
          <Route path=":workspaceId/boards/:boardId/settings" element={<BoardSettingsPage />} />
          <Route path=":workspaceId/boards/:boardId/team" element={<BoardTeamPage />} />
          <Route path=":workspaceId/boards/:boardId/analytics" element={<BoardAnalyticsPage />} />
        </Route>

        {/* Management Routes (Admin Only) */}
        <Route element={<RequireAdmin />}>
          <Route path="/manage" element={<Demo1Layout />}>
            <Route path="workspaces" element={<WorkspaceManagementPage />} />
          </Route>
        </Route>

        {/* Super Admin Routes */}
        <Route element={<RequireSuperAdmin />}>
          <Route path="/admin" element={<Demo1Layout />}>
            {/* Add super admin specific pages here */}
            <Route index element={<AdminDashboardPage />} />
          </Route>
        </Route>
      </Route>

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
