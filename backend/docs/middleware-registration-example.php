<?php

/**
 * Example of how to register the SubscriptionLimitMiddleware in your app/Http/Kernel.php file
 * 
 * This file is for documentation purposes only. Copy the relevant parts to your actual Kernel.php file.
 */

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    /**
     * The application's global HTTP middleware stack.
     *
     * These middleware are run during every request to your application.
     *
     * @var array<int, class-string|string>
     */
    protected $middleware = [
        // \App\Http\Middleware\TrustHosts::class,
        \App\Http\Middleware\TrustProxies::class,
        \Illuminate\Http\Middleware\HandleCors::class,
        \App\Http\Middleware\PreventRequestsDuringMaintenance::class,
        \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
        \App\Http\Middleware\TrimStrings::class,
        \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    ];

    /**
     * The application's route middleware groups.
     *
     * @var array<string, array<int, class-string|string>>
     */
    protected $middlewareGroups = [
        'web' => [
            \App\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \App\Http\Middleware\VerifyCsrfToken::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],

        'api' => [
            // \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            \Illuminate\Routing\Middleware\ThrottleRequests::class.':api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            // Add tenant resolution middleware first
            \App\Http\Middleware\TenantResolution::class,
            // Then add subscription limit middleware
            \App\Http\Middleware\SubscriptionLimitMiddleware::class,
        ],
    ];

    /**
     * The application's middleware aliases.
     *
     * Aliases may be used to conveniently assign middleware to routes and groups.
     *
     * @var array<string, class-string|string>
     */
    protected $middlewareAliases = [
        'auth' => \App\Http\Middleware\Authenticate::class,
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'auth.session' => \Illuminate\Session\Middleware\AuthenticateSession::class,
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can' => \Illuminate\Auth\Middleware\Authorize::class,
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
        'precognitive' => \Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests::class,
        'signed' => \App\Http\Middleware\ValidateSignature::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
        
        // Custom middleware aliases
        'tenant' => \App\Http\Middleware\TenantResolution::class,
        'subscription.limits' => \App\Http\Middleware\SubscriptionLimitMiddleware::class,
    ];

    /**
     * Example of how to apply the middleware to specific routes
     * 
     * Add this to your routes/api.php file:
     */

    /*
    // Apply to all API routes
    Route::middleware(['auth', 'tenant', 'subscription.limits'])->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('workspaces', WorkspaceController::class);
        Route::apiResource('invitations', InvitationController::class);
    });

    // Apply to specific routes
    Route::middleware(['auth', 'tenant', 'subscription.limits'])->group(function () {
        Route::post('/upload', [FileController::class, 'upload']);
        Route::get('/analytics', [AnalyticsController::class, 'index']);
    });

    // Bypass subscription checks for billing routes
    Route::middleware(['auth', 'tenant'])->group(function () {
        Route::get('/billing/plans', [BillingController::class, 'plans']);
        Route::post('/billing/subscribe', [BillingController::class, 'subscribe']);
    });

    // Apply middleware using alias
    Route::middleware(['auth', 'tenant', 'subscription.limits'])->group(function () {
        Route::apiResource('boards', BoardController::class);
    });
    */
}