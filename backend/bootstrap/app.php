<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\TenantResolution::class,
        ]);

        $middleware->api(append: [
            \App\Http\Middleware\TenantResolution::class,
        ]);

        // Add global middleware
        $middleware->api(prepend: [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        // Register route middleware aliases
        $middleware->alias([
            'workspace.permission' => \App\Http\Middleware\WorkspacePermission::class,
            'subscription.limit' => \App\Http\Middleware\SubscriptionLimitMiddleware::class,
            'permission' => \App\Http\Middleware\CheckPermission::class,
            'super.admin' => \App\Http\Middleware\SuperAdminMiddleware::class,
        ]);

        // Use custom authentication middleware
        $middleware->redirectGuestsTo(function (\Illuminate\Http\Request $request) {
            if ($request->is('api/*')) {
                return null; // Don't redirect for API routes
            }
            return route('login');
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated',
                    'error' => 'Authentication required'
                ], 401);
            }
        });
    })->create();
