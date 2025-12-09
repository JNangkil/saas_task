<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BoardController;
use App\Http\Controllers\BoardColumnController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\PlanController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TaskBulkOperationController;
use App\Http\Controllers\RealtimeController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskFieldValueController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\BoardViewPreferenceController;
use App\Http\Controllers\UserBoardPreferenceController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\WorkspaceController;
use App\Http\Controllers\WorkspaceMemberController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationPreferenceController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\AnalyticsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware(['auth:sanctum'])->group(function () {
    // Authentication routes
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware('auth:sanctum');

    // User profile routes
    Route::prefix('users')->group(function () {
        Route::get('/me', [UserController::class, 'me']);
        Route::patch('/me', [UserController::class, 'updateProfile']);
        Route::post('/me/avatar', [UserController::class, 'updateAvatar']);
        Route::delete('/me/avatar', [UserController::class, 'removeAvatar']);

        // Notification preferences
        Route::get('/me/notification-preferences', [NotificationPreferenceController::class, 'index']);
        Route::patch('/me/notification-preferences', [NotificationPreferenceController::class, 'update']);
    });

    // Notification routes
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::patch('/{notificationId}/read', [NotificationController::class, 'markAsRead']);
        Route::patch('/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::delete('/{notificationId}', [NotificationController::class, 'destroy']);
    });

    // Activity routes
    Route::prefix('activity')->group(function () {
        Route::get('/recent', [ActivityController::class, 'recentActivity']);
        Route::get('/tenant', [ActivityController::class, 'tenantActivity']);
    });

    // Tenant routes
    Route::prefix('tenants')->group(function () {
        Route::get('/', [TenantController::class, 'index'])->name('tenants.index');
        Route::post('/', [TenantController::class, 'store'])->name('tenants.store');
        Route::get('/{tenant}', [TenantController::class, 'show'])->name('tenants.show');
        Route::put('/{tenant}', [TenantController::class, 'update'])->name('tenants.update');
        Route::post('/{tenant}/archive', [TenantController::class, 'archive'])->name('tenants.archive');
        Route::post('/{tenant}/reactivate', [TenantController::class, 'reactivate'])->name('tenants.reactivate');
        Route::delete('/{tenant}', [TenantController::class, 'destroy'])->name('tenants.destroy');
        
        // Tenant member management
        Route::get('/{tenant}/members', [TenantController::class, 'members'])->name('tenants.members');
        Route::post('/{tenant}/members', [TenantController::class, 'addMember'])->name('tenants.members.add');
        Route::put('/{tenant}/members/{user}', [TenantController::class, 'updateMemberRole'])->name('tenants.members.update');
        Route::delete('/{tenant}/members/{user}', [TenantController::class, 'removeMember'])->name('tenants.members.remove');
        
        // Tenant settings
        Route::get('/{tenant}/settings', [TenantController::class, 'settings'])->name('tenants.settings');
        Route::put('/{tenant}/settings', [TenantController::class, 'updateSettings'])->name('tenants.settings.update');
        
        // Realtime Status
        Route::get('/{tenant}/realtime/status', [RealtimeController::class, 'status'])->name('tenants.realtime.status');
    });

    // Workspace routes
    Route::prefix('tenants/{tenant}/workspaces')->group(function () {
        Route::get('/', [WorkspaceController::class, 'index'])->name('workspaces.index');
        Route::post('/', [WorkspaceController::class, 'store'])->name('workspaces.store');
    });

    Route::prefix('workspaces')->group(function () {
        Route::get('/{workspace}', [WorkspaceController::class, 'show'])->name('workspaces.show');
        Route::put('/{workspace}', [WorkspaceController::class, 'update'])->name('workspaces.update');
        Route::post('/{workspace}/archive', [WorkspaceController::class, 'archive'])->name('workspaces.archive');
        Route::post('/{workspace}/restore', [WorkspaceController::class, 'restore'])->name('workspaces.restore');
        Route::delete('/{workspace}', [WorkspaceController::class, 'destroy'])->name('workspaces.destroy');
        
        // Workspace member management
        Route::get('/{workspace}/members', [WorkspaceMemberController::class, 'index'])->name('workspaces.members');
        Route::put('/{workspace}/members/{user}', [WorkspaceMemberController::class, 'update'])->name('workspaces.members.update');
        Route::delete('/{workspace}/members/{user}', [WorkspaceMemberController::class, 'destroy'])->name('workspaces.members.remove');
        Route::get('/{workspace}/permissions', [WorkspaceMemberController::class, 'permissions'])->name('workspaces.permissions');
        Route::post('/{workspace}/transfer-ownership/{user}', [WorkspaceMemberController::class, 'transferOwnership'])->name('workspaces.transfer-ownership');
        
        // Workspace settings
        Route::get('/{workspace}/settings', [WorkspaceController::class, 'settings'])->name('workspaces.settings');
        Route::put('/{workspace}/settings', [WorkspaceController::class, 'updateSettings'])->name('workspaces.settings.update');

        // Workspace activity
        Route::get('/{workspace}/activity', [ActivityController::class, 'workspaceActivity'])->name('workspaces.activity');

        // Workspace invitations
        Route::get('/{workspace}/invitations', [InvitationController::class, 'index'])->name('workspaces.invitations.index');
        Route::post('/{workspace}/invitations', [InvitationController::class, 'store'])->name('workspaces.invitations.store');
        Route::delete('/{workspace}/invitations/{invitation}', [InvitationController::class, 'destroy'])->name('workspaces.invitations.destroy');
        Route::post('/{workspace}/invitations/{invitation}/resend', [InvitationController::class, 'resend'])->name('workspaces.invitations.resend');

        // Analytics routes
        Route::prefix('{workspace}/analytics')->group(function () {
            Route::get('/summary', [AnalyticsController::class, 'getWorkspaceSummary'])->name('analytics.workspace.summary');
            Route::get('/user-productivity', [AnalyticsController::class, 'getUserProductivity'])->name('analytics.workspace.productivity');
            Route::get('/trends', [AnalyticsController::class, 'getActivityTrends'])->name('analytics.workspace.trends');
            Route::get('/export/csv', [AnalyticsController::class, 'exportWorkspaceCsv'])->name('analytics.workspace.export.csv');
            Route::get('/export/pdf', [AnalyticsController::class, 'exportWorkspacePdf'])->name('analytics.workspace.export.pdf');
            Route::delete('/cache', [AnalyticsController::class, 'clearWorkspaceCache'])->name('analytics.workspace.cache.clear');
        });

        // Task routes
        Route::prefix('tenants/{tenant}/workspaces/{workspace}/tasks')->group(function () {
            Route::get('/', [TaskController::class, 'index'])->name('tasks.index');
            Route::post('/', [TaskController::class, 'store'])->name('tasks.store');
        });
        
        // Board routes
        Route::prefix('tenants/{tenant}/workspaces/{workspace}/boards')->group(function () {
            Route::get('/', [BoardController::class, 'index'])->name('boards.index');
            Route::post('/', [BoardController::class, 'store'])->name('boards.store');
        });

        Route::prefix('tenants/{tenant}/workspaces/{workspace}/boards/{board}')->group(function () {
            Route::get('/', [BoardController::class, 'show'])->name('boards.show');
            Route::put('/', [BoardController::class, 'update'])->name('boards.update');
            Route::delete('/', [BoardController::class, 'destroy'])->name('boards.destroy');
            Route::post('/archive', [BoardController::class, 'archive'])->name('boards.archive');
            Route::post('/restore', [BoardController::class, 'restore'])->name('boards.restore');
            Route::post('/favorite', [BoardController::class, 'favorite'])->name('boards.favorite');
            Route::delete('/favorite', [BoardController::class, 'unfavorite'])->name('boards.unfavorite');

            // Board activity
            Route::get('/activity', [ActivityController::class, 'boardActivity'])->name('boards.activity');

            // Board analytics
            Route::get('/analytics/summary', [AnalyticsController::class, 'getBoardSummary'])->name('analytics.board.summary');
            Route::delete('/analytics/cache', [AnalyticsController::class, 'clearBoardCache'])->name('analytics.board.cache.clear');
        });

        Route::prefix('tenants/{tenant}/workspaces/{workspace}/boards/{board}/tasks')->group(function () {
            Route::get('/', [TaskController::class, 'index'])->name('boards.tasks.index');
            Route::get('/filter', [TaskController::class, 'filter'])->name('boards.tasks.filter');
            Route::post('/filter', [TaskController::class, 'filterAdvanced'])->name('boards.tasks.filter.advanced');
            Route::get('/filters/saved', [TaskController::class, 'savedFilters'])->name('boards.tasks.filters.saved');
            Route::post('/filters/save', [TaskController::class, 'saveFilter'])->name('boards.tasks.filters.save');
            Route::delete('/filters/{filter}', [TaskController::class, 'deleteFilter'])->name('boards.tasks.filters.delete');
        });
        
        Route::prefix('tenants/{tenant}/workspaces/{workspace}/tasks')->group(function () {
            Route::get('/{task}', [TaskController::class, 'show'])->name('tasks.show');
            Route::put('/{task}', [TaskController::class, 'update'])->name('tasks.update');
            Route::delete('/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');
            Route::post('/{task}/archive', [TaskController::class, 'archive'])->name('tasks.archive');
            Route::post('/{task}/restore', [TaskController::class, 'restore'])->name('tasks.restore');
            Route::post('/{task}/duplicate', [TaskController::class, 'duplicate'])->name('tasks.duplicate');
            Route::put('/{task}/position', [TaskController::class, 'updatePosition'])->name('tasks.position.update');

            // Task assignment and watchers
            Route::patch('/{task}/assignee', [TaskController::class, 'updateAssignee'])->name('tasks.assignee.update');
            Route::get('/{task}/watchers', [TaskController::class, 'getWatchers'])->name('tasks.watchers.index');
            Route::post('/{task}/watchers', [TaskController::class, 'addWatcher'])->name('tasks.watchers.store');
            Route::delete('/{task}/watchers/{user}', [TaskController::class, 'removeWatcher'])->name('tasks.watchers.destroy');

            // Task comments
            Route::prefix('/{task}/comments')->group(function () {
                Route::get('/', [TaskCommentController::class, 'index'])->name('tasks.comments.index');
                Route::post('/', [TaskCommentController::class, 'store'])->name('tasks.comments.store');
                Route::put('/{comment}', [TaskCommentController::class, 'update'])->name('tasks.comments.update');
                Route::delete('/{comment}', [TaskCommentController::class, 'destroy'])->name('tasks.comments.destroy');
            });

            // Task attachments
            Route::prefix('/{task}/attachments')->group(function () {
                Route::post('/', [AttachmentController::class, 'store'])->name('tasks.attachments.store');
            });

            // Task activity
            Route::get('/{task}/activity', [ActivityController::class, 'taskActivity'])->name('tasks.activity');
        });
        
        // Board column routes
        Route::prefix('tenants/{tenant}/workspaces/{workspace}/boards/{board}/columns')->group(function () {
            Route::get('/', [BoardColumnController::class, 'index'])->name('boards.columns.index');
            Route::post('/', [BoardColumnController::class, 'store'])->name('boards.columns.store');
            Route::post('/reorder', [BoardColumnController::class, 'reorder'])->name('boards.columns.reorder');
        });
        
        Route::prefix('tenants/{tenant}/workspaces/{workspace}/boards/{board}/columns/{column}')->group(function () {
            Route::get('/', [BoardColumnController::class, 'show'])->name('boards.columns.show');
            Route::put('/', [BoardColumnController::class, 'update'])->name('boards.columns.update');
            Route::delete('/', [BoardColumnController::class, 'destroy'])->name('boards.columns.destroy');
            Route::post('/duplicate', [BoardColumnController::class, 'duplicate'])->name('boards.columns.duplicate');
            Route::post('/toggle-pin', [BoardColumnController::class, 'togglePin'])->name('boards.columns.toggle-pin');
            Route::post('/toggle-required', [BoardColumnController::class, 'toggleRequired'])->name('boards.columns.toggle-required');
            Route::get('/statistics', [BoardColumnController::class, 'getStatistics'])->name('boards.columns.statistics');
        });
        
        // Board updates (polling fallback)
        Route::get('tenants/{tenant}/workspaces/{workspace}/boards/{board}/updates', [BoardController::class, 'updates'])->name('boards.updates');

        // Task field value routes
        Route::prefix('tenants/{tenant}/workspaces/{workspace}/tasks/{task}/field-values')->group(function () {
            Route::get('/', [TaskFieldValueController::class, 'index'])->name('tasks.field-values.index');
            Route::post('/', [TaskFieldValueController::class, 'store'])->name('tasks.field-values.store');
            Route::delete('/clear', [TaskFieldValueController::class, 'clearAll'])->name('tasks.field-values.clear');
        });
        
        Route::prefix('tenants/{tenant}/workspaces/{workspace}/tasks/{task}/field-values/{fieldValue}')->group(function () {
            Route::get('/', [TaskFieldValueController::class, 'show'])->name('tasks.field-values.show');
            Route::put('/', [TaskFieldValueController::class, 'update'])->name('tasks.field-values.update');
            Route::delete('/', [TaskFieldValueController::class, 'destroy'])->name('tasks.field-values.destroy');
        });
        
        // User board preference routes
        Route::prefix('tenants/{tenant}/workspaces/{workspace}/boards/{board}/preferences')->group(function () {
            Route::get('/', [UserBoardPreferenceController::class, 'index'])->name('boards.preferences.index');
            Route::put('/', [UserBoardPreferenceController::class, 'update'])->name('boards.preferences.update');
            Route::post('/reset', [UserBoardPreferenceController::class, 'reset'])->name('boards.preferences.reset');
            Route::put('/visibility', [UserBoardPreferenceController::class, 'updateVisibility'])->name('boards.preferences.visibility');
            Route::put('/widths', [UserBoardPreferenceController::class, 'updateWidths'])->name('boards.preferences.widths');
            Route::put('/positions', [UserBoardPreferenceController::class, 'updatePositions'])->name('boards.preferences.positions');
            Route::get('/visible-columns', [UserBoardPreferenceController::class, 'getVisibleColumns'])->name('boards.preferences.visible-columns');
            Route::get('/hidden-columns', [UserBoardPreferenceController::class, 'getHiddenColumns'])->name('boards.preferences.hidden-columns');
            Route::put('/reset-column', [UserBoardPreferenceController::class, 'resetColumn'])->name('boards.preferences.reset-column');
        });



        // Board Template routes (Workspace scoped creation)
        Route::post('/{workspace}/board-templates', [\App\Http\Controllers\BoardTemplateController::class, 'store'])->name('workspaces.board-templates.store');
    });

    // Board View Preference routes
    Route::prefix('tenants/{tenant}/workspaces/{workspace}/boards/{board}/view-preferences')->group(function () {
        Route::get('/', [BoardViewPreferenceController::class, 'show'])->name('boards.view-preferences.show');
        Route::put('/', [BoardViewPreferenceController::class, 'update'])->name('boards.view-preferences.update');
    });
    
    // Board Templates (Global/Tenant scoped)
    Route::prefix('board-templates')->group(function () {
        Route::get('/', [\App\Http\Controllers\BoardTemplateController::class, 'index'])->name('board-templates.index');
        Route::get('/{template}', [\App\Http\Controllers\BoardTemplateController::class, 'show'])->name('board-templates.show');
        Route::patch('/{template}', [\App\Http\Controllers\BoardTemplateController::class, 'update'])->name('board-templates.update');
        Route::delete('/{template}', [\App\Http\Controllers\BoardTemplateController::class, 'destroy'])->name('board-templates.destroy');
    });
    
    // Column types route (global)
    Route::get('/columns/types', [BoardColumnController::class, 'getTypes'])->name('columns.types');
    
    // Bulk field value operations
    Route::post('/tasks/bulk-field-values', [TaskFieldValueController::class, 'bulkUpdate'])->name('tasks.field-values.bulk-update');
    Route::delete('/tasks/bulk-field-values', [TaskFieldValueController::class, 'bulkDelete'])->name('tasks.field-values.bulk-delete');
    Route::get('/tasks/column-values', [TaskFieldValueController::class, 'getColumnValues'])->name('tasks.field-values.column-values');
    Route::get('/tasks/field-values/statistics', [TaskFieldValueController::class, 'getStatistics'])->name('tasks.field-values.statistics');
    
    // Bulk task operations
    Route::prefix('tasks')->group(function () {
        Route::post('/bulk-update', [TaskBulkOperationController::class, 'bulkUpdate'])->name('tasks.bulk-update');
        Route::post('/bulk-move', [TaskBulkOperationController::class, 'bulkMove'])->name('tasks.bulk-move');
        Route::post('/bulk-archive', [TaskBulkOperationController::class, 'bulkArchive'])->name('tasks.bulk-archive');
        Route::post('/bulk-delete', [TaskBulkOperationController::class, 'bulkDelete'])->name('tasks.bulk-delete');
        Route::post('/bulk-assign', [TaskBulkOperationController::class, 'bulkAssign'])->name('tasks.bulk-assign');
        Route::post('/bulk-set-status', [TaskBulkOperationController::class, 'bulkSetStatus'])->name('tasks.bulk-set-status');
        Route::post('/bulk-set-priority', [TaskBulkOperationController::class, 'bulkSetPriority'])->name('tasks.bulk-set-priority');
        Route::post('/bulk-add-labels', [TaskBulkOperationController::class, 'bulkAddLabels'])->name('tasks.bulk-add-labels');
        Route::post('/bulk-remove-labels', [TaskBulkOperationController::class, 'bulkRemoveLabels'])->name('tasks.bulk-remove-labels');
        Route::post('/bulk-set-due-date', [TaskBulkOperationController::class, 'bulkSetDueDate'])->name('tasks.bulk-set-due-date');
    });

    // Attachment routes
    Route::prefix('tenants/{tenant}/workspaces/{workspace}/attachments')->group(function () {
        Route::get('/{attachment}', [AttachmentController::class, 'show'])->name('attachments.show');
        Route::get('/{attachment}/download', [AttachmentController::class, 'download'])->name('attachments.download');
        Route::delete('/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');
    });
});

// Public plan routes (no auth required)
Route::prefix('plans')->group(function () {
    Route::get('/', [PlanController::class, 'index'])->name('plans.index');
    Route::get('/{slug}', [PlanController::class, 'show'])->name('plans.show');
    Route::get('/compare', [PlanController::class, 'compare'])->name('plans.compare');
    Route::get('/features', [PlanController::class, 'features'])->name('plans.features');
    
    // Authenticated plan routes
    Route::middleware(['auth:sanctum', 'tenant.resolution'])->group(function () {
        Route::get('/current', [PlanController::class, 'current'])->name('plans.current');
    });
});

// Subscription routes (require auth and tenant resolution)
Route::middleware(['auth:sanctum', 'tenant.resolution'])->prefix('subscription')->group(function () {
    Route::get('/', [SubscriptionController::class, 'index'])->name('subscription.index');
    Route::post('/checkout', [SubscriptionController::class, 'checkout'])->name('subscription.checkout');
    Route::post('/upgrade', [SubscriptionController::class, 'upgrade'])->name('subscription.upgrade');
    Route::post('/cancel', [SubscriptionController::class, 'cancel'])->name('subscription.cancel');
    Route::post('/resume', [SubscriptionController::class, 'resume'])->name('subscription.resume');
    Route::get('/portal', [SubscriptionController::class, 'portal'])->name('subscription.portal');
    Route::get('/history', [SubscriptionController::class, 'history'])->name('subscription.history');
    Route::get('/usage', [SubscriptionController::class, 'usage'])->name('subscription.usage');
});

// Public invitation routes (no auth required)
Route::prefix('invitations')->group(function () {
    Route::get('/{token}', [InvitationController::class, 'show'])->name('invitations.show');
    Route::post('/{token}/accept', [InvitationController::class, 'accept'])->name('invitations.accept');
    Route::post('/{token}/decline', [InvitationController::class, 'decline'])->name('invitations.decline');
});

// Webhook routes (no auth required, verified by signature)
Route::prefix('webhooks')->group(function () {
    Route::post('/stripe', [WebhookController::class, 'handleStripeWebhook'])->name('webhooks.stripe');
});