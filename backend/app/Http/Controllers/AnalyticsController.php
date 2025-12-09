<?php

namespace App\Http\Controllers;

use App\Services\AnalyticsService;
use App\Models\Workspace;
use App\Models\Board;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;
use PDF;

class AnalyticsController extends Controller
{
    public function __construct(private AnalyticsService $analyticsService)
    {
    }

    /**
     * Get workspace analytics summary
     */
    public function getWorkspaceSummary(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('view', $workspace);

        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : null;
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : null;

        $summary = $this->analyticsService->getWorkspaceSummary($workspace, $startDate, $endDate);

        return response()->json($summary);
    }

    /**
     * Get board analytics summary
     */
    public function getBoardSummary(Request $request, Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : null;
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : null;

        $summary = $this->analyticsService->getBoardSummary($board, $startDate, $endDate);

        return response()->json($summary);
    }

    /**
     * Get user productivity analytics for a workspace
     */
    public function getUserProductivity(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('view', $workspace);

        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : null;
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : null;

        $productivity = $this->analyticsService->getUserProductivity($workspace, $startDate, $endDate);

        return response()->json($productivity);
    }

    /**
     * Get activity trends for a workspace
     */
    public function getActivityTrends(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('view', $workspace);

        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $startDate = Carbon::parse($request->input('start_date'));
        $endDate = Carbon::parse($request->input('end_date'));

        $trends = $this->analyticsService->getActivityTrends($workspace, $startDate, $endDate);

        return response()->json($trends);
    }

    /**
     * Export workspace analytics to CSV
     */
    public function exportWorkspaceCsv(Request $request, Workspace $workspace): StreamedResponse
    {
        $this->authorize('view', $workspace);

        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : null;
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : null;

        $summary = $this->analyticsService->getWorkspaceSummary($workspace, $startDate, $endDate);
        $productivity = $this->analyticsService->getUserProductivity($workspace, $startDate, $endDate);
        $trends = $this->analyticsService->getActivityTrends(
            $workspace,
            $startDate ?: now()->subDays(30),
            $endDate ?: now()
        );

        $filename = "workspace_analytics_{$workspace->id}_" . now()->format('Y-m-d_H-i-s') . ".csv";

        return response()->streamDownload(function () use ($summary, $productivity, $trends) {
            $file = fopen('php://output', 'w');

            // Add UTF-8 BOM for proper Excel display
            fwrite($file, "\xEF\xBB\xBF");

            // Workspace Summary
            fputcsv($file, ['Workspace Analytics Summary']);
            fputcsv($file, ['Metric', 'Value']);
            fputcsv($file, ['Total Tasks', $summary['total_tasks']]);
            fputcsv($file, ['Completed Tasks', $summary['completed_tasks']]);
            fputcsv($file, ['Pending Tasks', $summary['pending_tasks']]);
            fputcsv($file, ['In Progress Tasks', $summary['in_progress_tasks']]);
            fputcsv($file, ['Overdue Tasks', $summary['overdue_tasks']]);
            fputcsv($file, ['Completion Rate (%)', $summary['completion_rate']]);
            fputcsv($file, ['Average Cycle Time (days)', $summary['average_cycle_time']]);
            fputcsv($file, []);

            // Tasks by Status
            fputcsv($file, ['Tasks by Status']);
            fputcsv($file, ['Status', 'Count']);
            foreach ($summary['tasks_by_status'] as $status => $count) {
                fputcsv($file, [ucwords(str_replace('_', ' ', $status)), $count]);
            }
            fputcsv($file, []);

            // Tasks by Priority
            fputcsv($file, ['Tasks by Priority']);
            fputcsv($file, ['Priority', 'Count']);
            foreach ($summary['tasks_by_priority'] as $priority => $count) {
                fputcsv($file, [ucfirst($priority), $count]);
            }
            fputcsv($file, []);

            // User Productivity
            fputcsv($file, ['User Productivity']);
            fputcsv($file, ['User Name', 'Email', 'Total Tasks', 'Completed Tasks', 'Completion Rate (%)', 'Avg Cycle Time (days)']);
            foreach ($productivity as $user) {
                fputcsv($file, [
                    $user['user']['name'],
                    $user['user']['email'],
                    $user['total_tasks'],
                    $user['completed_tasks'],
                    $user['completion_rate'],
                    $user['average_cycle_time']
                ]);
            }
            fputcsv($file, []);

            // Activity Trends
            fputcsv($file, ['Activity Trends']);
            fputcsv($file, ['Date', 'Tasks Created', 'Tasks Completed']);
            foreach ($trends as $trend) {
                fputcsv($file, [$trend['date'], $trend['created'], $trend['completed']]);
            }

            fclose($file);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Export workspace analytics to PDF
     */
    public function exportWorkspacePdf(Request $request, Workspace $workspace)
    {
        $this->authorize('view', $workspace);

        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : null;
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : null;

        $summary = $this->analyticsService->getWorkspaceSummary($workspace, $startDate, $endDate);
        $productivity = $this->analyticsService->getUserProductivity($workspace, $startDate, $endDate);
        $trends = $this->analyticsService->getActivityTrends(
            $workspace,
            $startDate ?: now()->subDays(30),
            $endDate ?: now()
        );

        $filename = "workspace_analytics_{$workspace->id}_" . now()->format('Y-m-d_H-i-s') . ".pdf";

        $data = [
            'workspace' => $workspace,
            'summary' => $summary,
            'productivity' => $productivity,
            'trends' => $trends,
            'startDate' => $startDate,
            'endDate' => $endDate,
        ];

        $pdf = PDF::loadView('pdf.analytics', $data);

        return $pdf->download($filename);
    }

    /**
     * Clear analytics cache for a workspace
     */
    public function clearWorkspaceCache(Workspace $workspace): JsonResponse
    {
        $this->authorize('manage', $workspace);

        $this->analyticsService->clearWorkspaceCache($workspace);

        return response()->json(['message' => 'Analytics cache cleared successfully']);
    }

    /**
     * Clear analytics cache for a board
     */
    public function clearBoardCache(Board $board): JsonResponse
    {
        $this->authorize('manage', $board);

        $this->analyticsService->clearBoardCache($board);

        return response()->json(['message' => 'Analytics cache cleared successfully']);
    }
}