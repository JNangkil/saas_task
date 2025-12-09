<?php

namespace App\Services;

use App\Models\Task;
use App\Models\Workspace;
use App\Models\Board;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\CarbonPeriod;
use Carbon\Carbon;

class AnalyticsService
{
    /**
     * Cache duration in seconds (default: 5 minutes)
     */
    private const CACHE_DURATION = 300;

    /**
     * Get workspace analytics summary
     */
    public function getWorkspaceSummary(Workspace $workspace, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        $cacheKey = "workspace_analytics_{$workspace->id}_{$startDate?->format('Y-m-d')}_{$endDate?->format('Y-m-d')}";

        return Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($workspace, $startDate, $endDate) {
            $query = $workspace->tasks()->active();

            if ($startDate) {
                $query->where('created_at', '>=', $startDate);
            }

            if ($endDate) {
                $query->where('created_at', '<=', $endDate);
            }

            $tasks = $query->get();

            return [
                'total_tasks' => $tasks->count(),
                'completed_tasks' => $tasks->where('status', 'done')->count(),
                'pending_tasks' => $tasks->where('status', 'todo')->count(),
                'in_progress_tasks' => $tasks->where('status', 'in_progress')->count(),
                'overdue_tasks' => $tasks->where('due_date', '<', now())->where('status', '!=', 'done')->count(),
                'completion_rate' => $tasks->count() > 0 ? round(($tasks->where('status', 'done')->count() / $tasks->count()) * 100, 2) : 0,
                'average_cycle_time' => $this->calculateAverageCycleTime($tasks),
                'tasks_by_priority' => $this->getTasksByPriority($tasks),
                'tasks_by_status' => $this->getTasksByStatus($tasks),
            ];
        });
    }

    /**
     * Get board analytics summary
     */
    public function getBoardSummary(Board $board, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        $cacheKey = "board_analytics_{$board->id}_{$startDate?->format('Y-m-d')}_{$endDate?->format('Y-m-d')}";

        return Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($board, $startDate, $endDate) {
            $query = $board->tasks()->active();

            if ($startDate) {
                $query->where('created_at', '>=', $startDate);
            }

            if ($endDate) {
                $query->where('created_at', '<=', $endDate);
            }

            $tasks = $query->get();

            return [
                'total_tasks' => $tasks->count(),
                'completed_tasks' => $tasks->where('status', 'done')->count(),
                'pending_tasks' => $tasks->where('status', 'todo')->count(),
                'in_progress_tasks' => $tasks->where('status', 'in_progress')->count(),
                'overdue_tasks' => $tasks->where('due_date', '<', now())->where('status', '!=', 'done')->count(),
                'completion_rate' => $tasks->count() > 0 ? round(($tasks->where('status', 'done')->count() / $tasks->count()) * 100, 2) : 0,
                'average_cycle_time' => $this->calculateAverageCycleTime($tasks),
            ];
        });
    }

    /**
     * Get user productivity analytics for a workspace
     */
    public function getUserProductivity(Workspace $workspace, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        $cacheKey = "user_productivity_{$workspace->id}_{$startDate?->format('Y-m-d')}_{$endDate?->format('Y-m-d')}";

        return Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($workspace, $startDate, $endDate) {
            $query = $workspace->tasks()->active()->with('assignee');

            if ($startDate) {
                $query->where('created_at', '>=', $startDate);
            }

            if ($endDate) {
                $query->where('created_at', '<=', $endDate);
            }

            $tasks = $query->get();
            $users = $workspace->users;

            $productivity = [];

            foreach ($users as $user) {
                $userTasks = $tasks->where('assignee_id', $user->id);
                $completedTasks = $userTasks->where('status', 'done');

                $productivity[] = [
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                    ],
                    'total_tasks' => $userTasks->count(),
                    'completed_tasks' => $completedTasks->count(),
                    'completion_rate' => $userTasks->count() > 0 ? round(($completedTasks->count() / $userTasks->count()) * 100, 2) : 0,
                    'average_cycle_time' => $this->calculateAverageCycleTime($userTasks),
                ];
            }

            // Sort by completion rate descending
            usort($productivity, function ($a, $b) {
                return $b['completion_rate'] <=> $a['completion_rate'];
            });

            return $productivity;
        });
    }

    /**
     * Get activity trends for a workspace
     */
    public function getActivityTrends(Workspace $workspace, Carbon $startDate, Carbon $endDate): array
    {
        $cacheKey = "activity_trends_{$workspace->id}_{$startDate->format('Y-m-d')}_{$endDate->format('Y-m-d')}";

        return Cache::remember($cacheKey, self::CACHE_DURATION, function () use ($workspace, $startDate, $endDate) {
            $period = CarbonPeriod::create($startDate, $endDate);
            $trends = [];

            foreach ($period as $date) {
                $dayStart = $date->copy()->startOfDay();
                $dayEnd = $date->copy()->endOfDay();

                $created = $workspace->tasks()
                    ->whereBetween('created_at', [$dayStart, $dayEnd])
                    ->count();

                $completed = $workspace->tasks()
                    ->whereBetween('completed_at', [$dayStart, $dayEnd])
                    ->count();

                $trends[] = [
                    'date' => $date->format('Y-m-d'),
                    'created' => $created,
                    'completed' => $completed,
                ];
            }

            return $trends;
        });
    }

    /**
     * Calculate average cycle time for tasks
     */
    private function calculateAverageCycleTime($tasks): float
    {
        $completedTasks = $tasks->where('status', 'done')->whereNotNull('completed_at');

        if ($completedTasks->isEmpty()) {
            return 0;
        }

        $totalDays = $completedTasks->sum(function ($task) {
            return $task->created_at->diffInDays($task->completed_at);
        });

        return round($totalDays / $completedTasks->count(), 2);
    }

    /**
     * Get tasks grouped by priority
     */
    private function getTasksByPriority($tasks): array
    {
        return [
            'low' => $tasks->where('priority', 'low')->count(),
            'medium' => $tasks->where('priority', 'medium')->count(),
            'high' => $tasks->where('priority', 'high')->count(),
            'urgent' => $tasks->where('priority', 'urgent')->count(),
        ];
    }

    /**
     * Get tasks grouped by status
     */
    private function getTasksByStatus($tasks): array
    {
        return [
            'todo' => $tasks->where('status', 'todo')->count(),
            'in_progress' => $tasks->where('status', 'in_progress')->count(),
            'done' => $tasks->where('status', 'done')->count(),
            'blocked' => $tasks->where('status', 'blocked')->count(),
        ];
    }

    /**
     * Clear analytics cache for a workspace
     */
    public function clearWorkspaceCache(Workspace $workspace): void
    {
        $pattern = "workspace_analytics_{$workspace->id}_*";
        $this->clearCacheByPattern($pattern);

        $pattern = "user_productivity_{$workspace->id}_*";
        $this->clearCacheByPattern($pattern);

        $pattern = "activity_trends_{$workspace->id}_*";
        $this->clearCacheByPattern($pattern);
    }

    /**
     * Clear analytics cache for a board
     */
    public function clearBoardCache(Board $board): void
    {
        $pattern = "board_analytics_{$board->id}_*";
        $this->clearCacheByPattern($pattern);
    }

    /**
     * Clear cache by pattern (works with Redis cache)
     */
    private function clearCacheByPattern(string $pattern): void
    {
        if (function_exists('redis')) {
            $redis = app('redis');
            $keys = $redis->keys("*{$pattern}*");

            if (!empty($keys)) {
                $redis->del($keys);
            }
        }
    }
}