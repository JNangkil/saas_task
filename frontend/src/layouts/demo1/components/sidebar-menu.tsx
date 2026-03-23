'use client';

import { JSX, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/services/workspace.service';
import { useBoards } from '@/services/board.service';
import { useAuth } from '@/auth/context/auth-context';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
  AccordionMenuSeparator,
} from '@/components/ui/accordion-menu';
import { 
  Settings, 
  Users, 
  TrendingUp, 
  Briefcase, 
  User, 
  LogOut,
  LayoutGrid,
  Loader2,
  Home,
  UserCircle,
  Network,
  ShoppingCart,
  Shield,
  Plus,
  Archive
} from 'lucide-react';

export function SidebarMenu() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();

  const matchPath = useCallback(
    (path: string): boolean =>
      path === pathname || (path.length > 1 && pathname.startsWith(path)),
    [pathname],
  );

  const classNames: AccordionMenuClassNames = {
    root: 'lg:ps-1',
    group: 'gap-px',
    label: 'uppercase text-[10px] font-bold tracking-wider text-muted-foreground/50 pt-4 pb-2 px-2',
    separator: 'my-2 mx-2 opacity-50',
    item: 'h-9 px-2.5 hover:bg-accent/60 text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-accent data-[selected=true]:font-medium rounded-lg transition-all duration-200',
    sub: '',
    subTrigger: 'h-9 px-2.5 hover:bg-accent/60 text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-accent data-[selected=true]:font-medium rounded-lg transition-all duration-200',
    subContent: 'ps-0 py-0.5',
    indicator: '',
  };

  const buildMenu = (): JSX.Element[] => {
    if (isLoadingWorkspaces) {
      return [
        <div key="loading" className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin h-5 w-5 text-muted-foreground/50" />
        </div>,
      ];
    }

    if (!workspaces || workspaces.length === 0) {
      return [
        <div key="empty" className="text-center py-6 text-muted-foreground text-xs italic">
          No workspaces found
        </div>,
      ];
    }

    return workspaces.map((workspace) => (
      <AccordionMenuSub key={workspace.id} value={`workspace-${workspace.id}`}>
        <AccordionMenuSubTrigger className="text-sm font-medium">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs mr-3 shrink-0 shadow-sm"
            style={{ backgroundColor: workspace.color + '25', color: workspace.color }}
          >
            {workspace.icon || '📊'}
          </div>
          <span className="truncate flex-1" data-slot="accordion-menu-title">{workspace.name}</span>
        </AccordionMenuSubTrigger>
        <AccordionMenuSubContent
          type="single"
          collapsible
          parentValue={`workspace-${workspace.id}`}
          className="mt-1 border-l ml-5 border-muted/80"
        >
          <AccordionMenuGroup className="ps-4">
            <AccordionMenuItem value={`/app/${workspace.id}`} className="h-8 mb-1">
              <Link to={`/app/${workspace.id}`} className="flex items-center gap-2.5 w-full">
                <LayoutGrid className="h-3.5 w-3.5 opacity-60" />
                <span className="text-[13px]">Overview</span>
              </Link>
            </AccordionMenuItem>
            
            <WorkspaceBoards workspaceId={workspace.id} tenantId={workspace.tenant_id} />
          </AccordionMenuGroup>
        </AccordionMenuSubContent>
      </AccordionMenuSub>
    ));
  };

  return (
    <div className="flex flex-col h-full py-4 px-4 overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto kt-scrollable-y-hover pr-1">
        <AccordionMenu
          selectedValue={pathname}
          matchPath={matchPath}
          type="single"
          collapsible
          classNames={classNames}
        >
          <AccordionMenuItem value="/app/workspaces" className="mb-2">
            <Link to="/app/workspaces" className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold">Workspaces</span>
            </Link>
          </AccordionMenuItem>

          <AccordionMenuLabel>Your Workspaces</AccordionMenuLabel>
          <AccordionMenuGroup className="mt-1">
            {buildMenu()}
          </AccordionMenuGroup>
        </AccordionMenu>
      </div>

      <div className="mt-auto pt-4 border-t border-muted/50 bg-background/95 backdrop-blur-sm">
        <AccordionMenu
          selectedValue={pathname}
          matchPath={matchPath}
          type="single"
          collapsible
          classNames={classNames}
        >
          <AccordionMenuLabel className="pt-0">Important</AccordionMenuLabel>
          <AccordionMenuGroup>
            <AccordionMenuItem value="/app/home">
              <Link to="/app/home" className="flex items-center gap-3 w-full">
                <Home className="h-4 w-4 shrink-0 opacity-70" />
                <span className="text-sm">Home</span>
              </Link>
            </AccordionMenuItem>
            
            <AccordionMenuItem value="/app/profiles">
              <Link to="/app/profiles" className="flex items-center gap-3 w-full">
                <UserCircle className="h-4 w-4 shrink-0 opacity-70" />
                <span className="text-sm">Profiles</span>
              </Link>
            </AccordionMenuItem>

            <AccordionMenuItem value="/app/account">
              <Link to="/app/account" className="flex items-center gap-3 w-full">
                <User className="h-4 w-4 shrink-0 opacity-70" />
                <span className="text-sm">My Account</span>
              </Link>
            </AccordionMenuItem>

            <AccordionMenuItem value="/app/network">
              <Link to="/app/network" className="flex items-center gap-3 w-full">
                <Network className="h-4 w-4 shrink-0 opacity-70" />
                <span className="text-sm">Network</span>
              </Link>
            </AccordionMenuItem>

            <AccordionMenuItem value="/app/store">
              <Link to="/app/store" className="flex items-center gap-3 w-full">
                <ShoppingCart className="h-4 w-4 shrink-0 opacity-70" />
                <span className="text-sm">Store</span>
              </Link>
            </AccordionMenuItem>

            <AccordionMenuItem value="/app/authentication">
              <Link to="/app/authentication" className="flex items-center gap-3 w-full">
                <Shield className="h-4 w-4 shrink-0 opacity-70" />
                <span className="text-sm">Authentication</span>
              </Link>
            </AccordionMenuItem>

            <AccordionMenuSeparator />

            <AccordionMenuItem 
              value="logout" 
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => logout()}
            >
              <div className="flex items-center gap-3 w-full cursor-pointer">
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="text-sm">Logout</span>
              </div>
            </AccordionMenuItem>
          </AccordionMenuGroup>
        </AccordionMenu>

        <AccordionMenu
          selectedValue={pathname}
          matchPath={matchPath}
          type="single"
          collapsible
          classNames={classNames}
          className="mt-4"
        >
          <AccordionMenuLabel className="pt-0">Boards</AccordionMenuLabel>
          <div className="px-2.5 py-1 text-[11px] text-muted-foreground opacity-60">Manage your boards</div>
          <AccordionMenuGroup>
            <AccordionMenuItem value="/app/boards/archived">
              <Link to="/app/boards/archived" className="flex items-center gap-3 w-full">
                <Archive className="h-4 w-4 shrink-0 opacity-70" />
                <span className="text-sm">Show Archived</span>
              </Link>
            </AccordionMenuItem>
            
            <AccordionMenuItem value="/app/boards/create">
              <Link to="/app/boards/create" className="flex items-center gap-3 w-full">
                <Plus className="h-4 w-4 shrink-0 opacity-70" />
                <span className="text-sm font-medium">Create Board</span>
              </Link>
            </AccordionMenuItem>
          </AccordionMenuGroup>
        </AccordionMenu>
      </div>
    </div>
  );
}

function WorkspaceBoards({ workspaceId, tenantId }: { workspaceId: number; tenantId: number }) {
  const navigate = useNavigate();
  const { data: boards, isLoading } = useBoards(workspaceId, tenantId);

  if (isLoading) {
    return (
      <div className="flex items-center ps-2 py-3">
        <Loader2 className="animate-spin h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
    );
  }

  if (!boards || boards.length === 0) {
    return null;
  }

  return (
    <>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 px-2.5 py-2 mt-1">
        Boards
      </div>
      <AccordionMenuGroup className="gap-0.5">
        {boards.map((board) => (
          <AccordionMenuSub key={board.id} value={`board-${board.id}`}>
            <AccordionMenuSubTrigger 
              className="h-8 px-2.5 text-[13px] hover:bg-accent/40"
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] mr-2.5 shrink-0 shadow-xs"
                style={{ backgroundColor: board.color + '20', color: board.color }}
              >
                {board.icon || '📋'}
              </div>
              <span className="truncate flex-1">{board.name}</span>
            </AccordionMenuSubTrigger>
            <AccordionMenuSubContent
              type="single"
              collapsible
              parentValue={`board-${board.id}`}
              className="mt-0.5 border-l ml-5 border-muted/50"
            >
              <AccordionMenuGroup className="ps-3 gap-px">
                <AccordionMenuItem value={`/app/${workspaceId}/boards/${board.id}/settings`} className="h-7 px-2">
                  <Link to={`/app/${workspaceId}/boards/${board.id}/settings`} className="flex items-center gap-2.5 w-full">
                    <Settings className="h-3.5 w-3.5 opacity-60" />
                    <span className="text-[12px]">Settings</span>
                  </Link>
                </AccordionMenuItem>
                <AccordionMenuItem value={`/app/${workspaceId}/boards/${board.id}/team`} className="h-7 px-2">
                  <Link to={`/app/${workspaceId}/boards/${board.id}/team`} className="flex items-center gap-2.5 w-full">
                    <Users className="h-3.5 w-3.5 opacity-60" />
                    <span className="text-[12px]">Team</span>
                  </Link>
                </AccordionMenuItem>
                <AccordionMenuItem value={`/app/${workspaceId}/boards/${board.id}/analytics`} className="h-7 px-2">
                  <Link to={`/app/${workspaceId}/boards/${board.id}/analytics`} className="flex items-center gap-2.5 w-full">
                    <TrendingUp className="h-3.5 w-3.5 opacity-60" />
                    <span className="text-[12px]">Analytics</span>
                  </Link>
                </AccordionMenuItem>
              </AccordionMenuGroup>
            </AccordionMenuSubContent>
          </AccordionMenuSub>
        ))}
      </AccordionMenuGroup>
    </>
  );
}
