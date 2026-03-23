/**
 * Dashboard Statistics
 */
export interface DashboardStats {
  workspaces_count: number;
  boards_count: number;
  tasks_count: number;
  active_users_count: number;
  tasks_completed_this_week: number;
  tasks_in_progress: number;
}

/**
 * Workspace Summary
 */
export interface WorkspaceSummary {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  average_cycle_time: number;
  tasks_by_priority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  tasks_by_status: {
    todo: number;
    in_progress: number;
    done: number;
    blocked: number;
  };
}

/**
 * Board Summary
 */
export interface BoardSummary {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  average_cycle_time: number;
}

/**
 * User Productivity
 */
export interface UserProductivity {
  user: {
    id: number;
    name: string;
    email: string;
  };
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  average_cycle_time: number;
}

/**
 * Activity Trend
 */
export interface ActivityTrend {
  date: string;
  created: number;
  completed: number;
}

/**
 * Analytics Filters
 */
export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
}
