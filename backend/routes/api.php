<?php

use App\Http\Controllers\TenantController;
use App\Http\Controllers\WorkspaceController;
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
        Route::get('/{workspace}/members', [WorkspaceController::class, 'members'])->name('workspaces.members');
        Route::post('/{workspace}/members', [WorkspaceController::class, 'addMember'])->name('workspaces.members.add');
        Route::put('/{workspace}/members/{user}', [WorkspaceController::class, 'updateMemberRole'])->name('workspaces.members.update');
        Route::delete('/{workspace}/members/{user}', [WorkspaceController::class, 'removeMember'])->name('workspaces.members.remove');
        
        // Workspace settings
        Route::get('/{workspace}/settings', [WorkspaceController::class, 'settings'])->name('workspaces.settings');
        Route::put('/{workspace}/settings', [WorkspaceController::class, 'updateSettings'])->name('workspaces.settings.update');
    });
});