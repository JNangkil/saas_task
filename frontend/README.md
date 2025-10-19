# TaskFlow Frontend

Angular 20 SPA that consumes the Laravel auth API.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
```

## Local Development

1. Start the Laravel API at `http://localhost:8000` (see `../backend/README.md`).
2. Update `src/environments/environment.ts` if your API runs on a different host or port.
3. Launch the Angular dev server:

   ```bash
   npm start
   ```

   The app is served at `http://localhost:4200`.

## Available Auth Flows

- Sign in (`/auth/login`)
- Create workspace + account (`/auth/register`)
- Forgot password (`/auth/forgot-password`)
- Reset password via emailed token (`/auth/reset-password?token=...&email=...`)

Successful login or registration stores the Sanctum bearer token and redirects into the authenticated area (dashboard). Guards ensure onboarding and role-based routing.

## Quality Checks

- Type check: `npx tsc --noEmit`
- Build (may require additional memory in constrained environments): `npm run build`

## Directory Highlights

- `src/app/core/services/auth.service.ts` — session orchestration, token storage, guards bootstrap
- `src/app/features/auth/pages/*` — standalone pages for login, register, and reset flows

Shared UI primitives live under `src/app/shared`.
