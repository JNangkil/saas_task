# Change: Add Security & Authentication

## Why

Secure authentication is foundational for any SaaS:
- JWT-based stateless authentication
- Password reset for account recovery
- MFA for enhanced security
- Rate limiting to prevent abuse

## What Changes

### JWT Authentication
- Register, login, logout, refresh endpoints
- Token with user and tenant context
- Secure frontend storage

### Password Reset
- Email-based reset flow
- Time-limited tokens
- Secure token storage

### Multi-Factor Authentication
- TOTP-based MFA (authenticator apps)
- QR code setup flow
- Recovery codes

### Security Hardening
- Rate limiting on auth endpoints
- Account lockout after failed attempts
- HTTPS-only cookies

## Impact

### Affected Specs (New Capabilities)
- `jwt-auth`: Auth endpoints, tokens, middleware
- `password-reset`: Reset flow, email, tokens
- `mfa`: TOTP setup, verification, recovery

### Dependencies
- Foundation for all other features
- Integrates with user management
