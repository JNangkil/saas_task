import { Navigate, Route, Routes } from 'react-router';
import { RequireAuth } from '@/auth/require-auth';
import { AuthRouting } from '@/auth/auth-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import { BoardListPage } from '@/pages/workspace/board-list-page';
import { BoardDetailPage } from '@/pages/workspace/board-detail-page';
import { WorkspaceManagementPage } from '@/pages/workspace/workspace-management-page';

export function AppRoutingSetup() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/*" element={<AuthRouting />} />

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
          
          {/* Board Detail */}
          <Route path=":workspaceId/boards/:boardId" element={<BoardDetailPage />} />
          <Route path=":workspaceId/boards/:boardId/settings" element={<BoardDetailPage />} />
        </Route>

        {/* Management Routes */}
        <Route path="/manage" element={<Demo1Layout />}>
          <Route path="workspaces" element={<WorkspaceManagementPage />} />
        </Route>
      </Route>

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
