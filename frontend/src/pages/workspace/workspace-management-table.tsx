'use client';

import { useMemo, useState } from 'react';
import { RiCheckboxCircleFill } from '@remixicon/react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  Row,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { EllipsisVertical, Search, Settings2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardToolbar,
} from '@/components/ui/card';
import { DataGrid, useDataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/ui/data-grid-table';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
} from '@/components/ui/dropdown-menu';
import { useWorkspaces, useDeleteWorkspace } from '@/services/workspace.service';

interface IWorkspaceData {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  tenant_id: number;
  created_at: string;
  updated_at: string;
}

function ActionsCell({ 
  row, 
  onDelete 
}: { 
  row: Row<IWorkspaceData>;
  onDelete: (id: number) => void;
}) {
  const { copyToClipboard } = useCopyToClipboard();
  const handleCopyId = () => {
    copyToClipboard(String(row.original.id));
    const message = `Workspace ID successfully copied: ${row.original.id}`;
    toast.custom(
      (t) => (
        <Alert
          variant="mono"
          icon="success"
          close={false}
          onClose={() => toast.dismiss(t)}
        >
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>
          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ),
      {
        position: 'top-center',
      },
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-7" mode="icon" variant="ghost">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end">
        <DropdownMenuItem asChild>
          <Link to={`/app/${row.original.id}`}>Open</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyId}>Copy ID</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          variant="destructive" 
          onClick={() => onDelete(row.original.id)}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkspaceManagementTable() {
  const { data: workspaces = [], isLoading, error } = useWorkspaces();
  const deleteWorkspace = useDeleteWorkspace();
  
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState('');

  const handleDeleteWorkspace = async (id: number) => {
    if (confirm('Are you sure you want to delete this workspace?')) {
      try {
        await deleteWorkspace.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete workspace:', error);
      }
    }
  };

  const filteredData = useMemo(() => {
    let filtered = workspaces;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower)),
      );
    }

    return filtered;
  }, [searchQuery, workspaces]);

  const columns = useMemo<ColumnDef<IWorkspaceData>[]>(
    () => [
      {
        accessorKey: 'id',
        accessorFn: (row) => row.id,
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        size: 51,
        meta: {
          cellClassName: '',
        },
      },
      {
        id: 'name',
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataGridColumnHeader title="Workspace" column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-4">
            <div
              className="w-9 h-9 rounded flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: row.original.color + '20' }}
            >
              {row.original.icon || '📊'}
            </div>
            <div className="flex flex-col gap-0.5">
              <Link
                to={`/app/${row.original.id}`}
                className="text-sm font-medium text-mono hover:text-primary-active mb-px"
              >
                {row.original.name}
              </Link>
              {row.original.description && (
                <div className="text-sm text-secondary-foreground font-normal">
                  {row.original.description}
                </div>
              )}
            </div>
          </div>
        ),
        enableSorting: true,
        size: 300,
        meta: {
          headerClassName: '',
        },
      },
      {
        id: 'created_at',
        accessorFn: (row) => row.created_at,
        header: ({ column }) => (
          <DataGridColumnHeader title="Created" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-foreground font-normal">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
        enableSorting: true,
        size: 180,
        meta: {
          headerClassName: '',
        },
      },
      {
        id: 'updated_at',
        accessorFn: (row) => row.updated_at,
        header: ({ column }) => (
          <DataGridColumnHeader title="Last Updated" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-foreground font-normal">
            {new Date(row.original.updated_at).toLocaleDateString()}
          </span>
        ),
        enableSorting: true,
        size: 180,
        meta: {
          headerClassName: '',
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => <ActionsCell row={row} onDelete={handleDeleteWorkspace} />,
        enableSorting: false,
        size: 60,
        meta: {
          headerClassName: '',
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData?.length || 0) / pagination.pageSize),
    getRowId: (row: IWorkspaceData) => String(row.id),
    state: {
      pagination,
      sorting,
      rowSelection,
    },
    columnResizeMode: 'onChange',
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const Toolbar = () => {
    const { table } = useDataGrid();

    return (
      <CardToolbar>
        <DataGridColumnVisibility
          table={table}
          trigger={
            <Button variant="outline">
              <Settings2 />
              Columns
            </Button>
          }
        />
      </CardToolbar>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading workspaces...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Failed to load workspaces</div>;
  }

  return (
    <DataGrid
      table={table}
      recordCount={filteredData?.length || 0}
      tableLayout={{
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
        cellBorder: true,
      }}
    >
      <Card>
        <CardHeader>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search Workspaces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 w-40"
                />
                {searchQuery.length > 0 && (
                  <Button
                    mode="icon"
                    variant="ghost"
                    className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery('')}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Toolbar />
        </CardHeader>
        <CardTable className="grid grow">
          <ScrollArea>
            <DataGridTable />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardTable>
        <CardFooter>
          <DataGridPagination />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}
