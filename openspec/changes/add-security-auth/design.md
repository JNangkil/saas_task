# Design: Security & Authentication

## Context

This design documents JWT-based authentication with optional MFA and security hardening measures.

## Goals / Non-Goals

### Goals
- Stateless JWT authentication
- Secure password reset flow
- Optional TOTP-based MFA
- Rate limiting and lockout

### Non-Goals
- OAuth/social login (separate feature)
- Passwordless/magic link auth
- Hardware key MFA (FIDO2)

## Decisions

### D1: JWT Token Structure

**Access Token Claims:**
```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "email": "user@example.com",
  "is_super_admin": false,
  "iat": 1700000000,
  "exp": 1700003600
}
```

**Token Lifetimes:**
- Access token: 60 minutes
- Refresh token: 14 days

### D2: Password Reset Token

```sql
CREATE TABLE password_reset_tokens (
    email VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP
);
```

- Token expires after 60 minutes
- Token hashed before storage
- One active token per email

### D3: MFA Data Model

```sql
CREATE TABLE user_mfa (
    user_id UUID PRIMARY KEY,
    secret VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    recovery_codes JSON,
    enabled_at TIMESTAMP,
    created_at TIMESTAMP
);
```

### D4: MFA Login Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Login     │────▶│  Check MFA   │────▶│  Full Token  │
│   Creds OK  │     │  Enabled?    │     │  Issued      │
└─────────────┘     └──────────────┘     └──────────────┘
                           │ Yes                ▲
                           ▼                    │
                    ┌──────────────┐     ┌──────┴───────┐
                    │  Return      │────▶│  Verify      │
                    │  mfa_required│     │  TOTP Code   │
                    └──────────────┘     └──────────────┘
```

### D5: Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/login | 5 requests | 1 minute |
| /auth/register | 3 requests | 1 minute |
| /auth/password/forgot | 3 requests | 1 minute |
| /auth/mfa/challenge | 5 requests | 1 minute |

### D6: Account Lockout

- Lock after 5 consecutive failed attempts
- Lockout duration: 30 minutes
- Notify user via email on lockout

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Token theft | High | Short TTL, HTTPS only |
| Brute force | Medium | Rate limiting, lockout |
| MFA bypass | High | Recovery codes encrypted |
