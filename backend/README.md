# TaskFlow API

Laravel 12 API that powers authentication for the TaskFlow SaaS prototype.

## Prerequisites

- PHP 8.2+
- Composer
- SQLite (default) or another database connection configured in `.env`

## Getting Started

1. Install PHP dependencies:

   ```bash
   composer install
   ```

2. Copy the default environment file and generate an application key:

   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. Run database migrations (uses `database/database.sqlite` by default):

   ```bash
   php artisan migrate
   ```

4. Serve the API locally:

   ```bash
   php artisan serve --host=127.0.0.1 --port=8000
   ```

   The Angular frontend expects the API at `http://localhost:8000/api`. Update `FRONTEND_URL` in `.env` if you serve the client from a different origin.

## Auth Endpoints

All responses are JSON and use Bearer tokens issued by Laravel Sanctum.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create a user + workspace owner. Body fields: `name`, `company_name`, `email`, `password`, `password_confirmation`, optional `locale`. Returns `{ token, user }` |
| `/api/auth/login` | POST | Authenticate with `email` and `password`. Returns `{ token, user }` |
| `/api/auth/me` | GET | Fetch the currently authenticated user. Requires `Authorization: Bearer <token>` |
| `/api/auth/logout` | POST | Revoke the current access token |
| `/api/auth/password/forgot` | POST | Request a reset email. Body: `email` |
| `/api/auth/password/reset` | POST | Reset password with `email`, `token`, `password`, `password_confirmation` |

The `user` object mirrors the Angular model: `id`, `email`, `displayName`, `roles`, `onboardingCompleted`, `locale`, `companyName`.

## Testing

Run the PHP feature tests:

```bash
php artisan test
```

They cover registration and login flows.
