<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    Route::post('/password/forgot', [PasswordResetController::class, 'sendResetLink'])
        ->name('password.email');
    Route::post('/password/reset', [PasswordResetController::class, 'reset'])
        ->name('password.update');
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/onboarding/complete', [OnboardingController::class, 'complete']);

    Route::get('/workspaces', [WorkspaceController::class, 'index']);
    Route::post('/workspaces', [WorkspaceController::class, 'store']);
    Route::get('/workspaces/{workspaceId}', [WorkspaceController::class, 'show']);
    Route::match(['put', 'patch'], '/workspaces/{workspaceId}', [WorkspaceController::class, 'update']);
    Route::delete('/workspaces/{workspaceId}', [WorkspaceController::class, 'destroy']);
});
