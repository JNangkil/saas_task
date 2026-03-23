<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // For API routes, return null to prevent redirect
        // The authentication exception will be converted to JSON response
        if ($request->is('api/*')) {
            return null;
        }

        return $request->expectsJson()
            ? null
            : route('login');
    }
}
