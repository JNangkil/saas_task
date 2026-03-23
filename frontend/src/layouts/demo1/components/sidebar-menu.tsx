'use client';

import { JSX } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/services/workspace.service';
import { useBoards } from '@/services/board.service';
import { useAuth } from '@/auth/context/auth-context';
import { cn } from '@/lib/utils';
import { 
  Plus,
  LogOut,
  LayoutGrid,
  Loader2,
  ChevronDown,
  Check,
  Settings,
  Briefcase,
  Trello,
  User
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SidebarMenu() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();

  // Find active workspace based on URL /app/:workspaceId
  const pathParts = pathname.split('/');
  const activeWorkspaceIdStr = pathParts[2];
  const activeWorkspaceId = activeWorkspaceIdStr ? parseInt(activeWorkspaceIdStr) : null;
  const activeWorkspace = workspaces?.find(w => w.id === activeWorkspaceId) || workspaces?.[0];

  if (isLoadingWorkspaces) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin h-5 w-5 text-muted-foreground/30" />
      </div>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-xs italic">
        No workspaces found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background p3-sidebar">
      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-4 px-4 kt-scrollable-y-hover">
        {/* Workspace Header Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="p3-ws-header outline-none">
              <div 
                className="p3-ws-icon" 
                style={{ background: (activeWorkspace?.color || '#3b82f6') + '20', color: activeWorkspace?.color || '#3b82f6' }}
              >
                <Briefcase className="w-3.5 h-3.5" />
              </div>
              <div className="p3-ws-name" data-slot="accordion-menu-title">{activeWorkspace?.name || 'My Workspace'}</div>
              <ChevronDown className="p3-ws-chev" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px]">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((workspace) => (
              <DropdownMenuItem 
                key={workspace.id} 
                onClick={() => navigate(`/app/${workspace.id}`)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div 
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0"
                  style={{ backgroundColor: workspace.color + '20', color: workspace.color }}
                >
                  <Briefcase className="w-3 h-3" />
                </div>
                <span className="flex-1 truncate">{workspace.name}</span>
                {workspace.id === activeWorkspace?.id && <Check className="w-3.5 h-3.5 text-primary" />}
              </DropdownMenuItem>            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/app/workspaces')} className="cursor-pointer">
              <LayoutGrid className="w-4 h-4 mr-2" />
              <span>Manage Workspaces</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Overview Section */}
        <div className="p3-label" data-slot="accordion-menu-label">Overview</div>
        <Link 
          to={`/app/${activeWorkspace?.id}`} 
          className={cn("p3-nav-item", pathname === `/app/${activeWorkspace?.id}` && "active")}
        >
          <LayoutGrid />
          <span data-slot="accordion-menu-title">Overview</span>
        </Link>

        {/* Boards Section */}
        <div className="p3-label" data-slot="accordion-menu-label">Boards</div>
        <WorkspaceBoards 
          workspaceId={activeWorkspace?.id || 0} 
          tenantId={activeWorkspace?.tenant_id || 0} 
          pathname={pathname}
        />
        
        <Link 
          to={`/app/${activeWorkspace?.id}/boards/create`} 
          className="p3-board-item" 
          style={{ color: 'var(--tw-color-muted-foreground)', fontSize: '11px', opacity: 0.7 }}
        >
          <Plus className="!w-[12px] !h-[12px]" />
          <span data-slot="accordion-menu-title">Add board</span>
        </Link>
      </div>

      {/* Footer Area */}
      <div className="mt-auto p-4 flex flex-col gap-1 border-t border-muted/20">
        <Link to={`/app/${activeWorkspace?.id}/settings`} className={cn("p3-nav-item", pathname.includes('/settings') && "active")}>
          <Settings className="w-4 h-4 opacity-70" />
          <span data-slot="accordion-menu-title">Settings</span>
        </Link>
        
        <Link to="/app/account" className={cn("p3-nav-item", pathname === "/app/account" && "active")}>
          <User className="w-4 h-4 opacity-70" />
          <span data-slot="accordion-menu-title">My Account</span>
        </Link>

        {/* Logout */}
        <div 
          className="p3-nav-item text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer mt-2"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          <span data-slot="accordion-menu-title">Logout</span>
        </div>
      </div>
    </div>
  );
}

function WorkspaceBoards({ 
  workspaceId, 
  tenantId, 
  pathname 
}: { 
  workspaceId: number; 
  tenantId: number; 
  pathname: string;
}) {
  const { data: boards, isLoading } = useBoards(workspaceId, tenantId);

  if (isLoading) {
    return (
      <div className="flex items-center ps-4 py-2">
        <Loader2 className="animate-spin h-3.5 w-3.5 text-muted-foreground/30" />
      </div>
    );
  }

  if (!boards || boards.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {boards.map((board) => {
        const boardUrl = `/app/${workspaceId}/boards/${board.id}`;
        const isActive = pathname.startsWith(boardUrl);
        
        return (
          <Link 
            key={board.id} 
            to={boardUrl} 
            className={cn("p3-board-item", isActive && "active")}
          >
            <Trello 
              className="w-3.5 h-3.5" 
              style={{ color: board.color || 'var(--tw-color-primary)' }}
            />
            <span className="truncate flex-1" data-slot="accordion-menu-title">{board.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
