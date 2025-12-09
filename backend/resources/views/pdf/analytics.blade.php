<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Workspace Analytics - {{ $workspace->name }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #333;
            line-height: 1.5;
        }

        .header {
            background-color: #f8f9fa;
            padding: 20px;
            margin-bottom: 30px;
            border-bottom: 2px solid #dee2e6;
        }

        .header h1 {
            margin: 0;
            color: #495057;
            font-size: 24px;
        }

        .header p {
            margin: 5px 0 0 0;
            color: #6c757d;
        }

        .summary-cards {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 30px;
        }

        .card {
            flex: 1;
            min-width: 200px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
        }

        .card-title {
            font-size: 14px;
            font-weight: 600;
            color: #6c757d;
            margin-bottom: 8px;
        }

        .card-value {
            font-size: 24px;
            font-weight: bold;
            color: #495057;
        }

        .card-value.completed { color: #28a745; }
        .card-value.pending { color: #ffc107; }
        .card-value.overdue { color: #dc3545; }
        .card-value.in-progress { color: #17a2b8; }

        .section {
            margin-bottom: 30px;
        }

        .section h2 {
            font-size: 18px;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th, td {
            border: 1px solid #dee2e6;
            padding: 12px;
            text-align: left;
        }

        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }

        tr:nth-child(even) {
            background-color: #f8f9fa;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }

        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background-color: #28a745;
        }

        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: #f8f9fa;
            padding: 10px 20px;
            border-top: 1px solid #dee2e6;
            font-size: 10px;
            color: #6c757d;
        }

        .page-break {
            page-break-before: always;
        }

        @media print {
            .footer {
                position: fixed;
                bottom: 0;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Workspace Analytics Report</h1>
        <p><strong>{{ $workspace->name }}</strong></p>
        <p>Generated on {{ now()->format('F j, Y \a\t g:i A') }}</p>
        @if($startDate && $endDate)
        <p>Date Range: {{ $startDate->format('M j, Y') }} - {{ $endDate->format('M j, Y') }}</p>
        @endif
    </div>

    <div class="summary-cards">
        <div class="card">
            <div class="card-title">Total Tasks</div>
            <div class="card-value">{{ $summary['total_tasks'] }}</div>
        </div>
        <div class="card">
            <div class="card-title">Completed</div>
            <div class="card-value completed">{{ $summary['completed_tasks'] }}</div>
        </div>
        <div class="card">
            <div class="card-title">In Progress</div>
            <div class="card-value in-progress">{{ $summary['in_progress_tasks'] }}</div>
        </div>
        <div class="card">
            <div class="card-title">Pending</div>
            <div class="card-value pending">{{ $summary['pending_tasks'] }}</div>
        </div>
        <div class="card">
            <div class="card-title">Overdue</div>
            <div class="card-value overdue">{{ $summary['overdue_tasks'] }}</div>
        </div>
    </div>

    <div class="section">
        <h2>Performance Metrics</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
            </tr>
            <tr>
                <td>Completion Rate</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="flex: 1;">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: {{ $summary['completion_rate'] }}%"></div>
                            </div>
                        </div>
                        <span style="font-weight: bold;">{{ $summary['completion_rate'] }}%</span>
                    </div>
                </td>
            </tr>
            <tr>
                <td>Average Cycle Time</td>
                <td>{{ round($summary['average_cycle_time'], 1) }} days</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Tasks by Status</h2>
        <table>
            <thead>
                <tr>
                    <th>Status</th>
                    <th class="text-center">Count</th>
                    <th class="text-center">Percentage</th>
                </tr>
            </thead>
            <tbody>
                @foreach($summary['tasks_by_status'] as $status => $count)
                <tr>
                    <td>{{ ucwords(str_replace('_', ' ', $status)) }}</td>
                    <td class="text-center">{{ $count }}</td>
                    <td class="text-center">{{ $summary['total_tasks'] > 0 ? round(($count / $summary['total_tasks']) * 100, 1) : 0 }}%</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="page-break"></div>

    <div class="section">
        <h2>Tasks by Priority</h2>
        <table>
            <thead>
                <tr>
                    <th>Priority</th>
                    <th class="text-center">Count</th>
                    <th class="text-center">Percentage</th>
                </tr>
            </thead>
            <tbody>
                @foreach($summary['tasks_by_priority'] as $priority => $count)
                <tr>
                    <td>{{ ucfirst($priority) }}</td>
                    <td class="text-center">{{ $count }}</td>
                    <td class="text-center">{{ $summary['total_tasks'] > 0 ? round(($count / $summary['total_tasks']) * 100, 1) : 0 }}%</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>User Productivity</h2>
        <table>
            <thead>
                <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th class="text-center">Total Tasks</th>
                    <th class="text-center">Completed</th>
                    <th class="text-center">Completion Rate</th>
                    <th class="text-center">Avg Cycle Time</th>
                </tr>
            </thead>
            <tbody>
                @foreach($productivity as $user)
                <tr>
                    <td>{{ $user['user']['name'] }}</td>
                    <td>{{ $user['user']['email'] }}</td>
                    <td class="text-center">{{ $user['total_tasks'] }}</td>
                    <td class="text-center">{{ $user['completed_tasks'] }}</td>
                    <td class="text-center">{{ $user['completion_rate'] }}%</td>
                    <td class="text-center">{{ round($user['average_cycle_time'], 1) }} days</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    @if(!empty($trends))
    <div class="page-break"></div>

    <div class="section">
        <h2>Activity Trends (Last 30 Days)</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th class="text-center">Tasks Created</th>
                    <th class="text-center">Tasks Completed</th>
                </tr>
            </thead>
            <tbody>
                @foreach($trends as $trend)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($trend['date'])->format('M j, Y') }}</td>
                    <td class="text-center">{{ $trend['created'] }}</td>
                    <td class="text-center">{{ $trend['completed'] }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @endif

    <div class="footer">
        Report generated by Task Management System on {{ now()->format('F j, Y \a\t g:i A') }}
    </div>
</body>
</html>