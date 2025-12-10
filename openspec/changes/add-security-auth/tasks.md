# Tasks: Add Security & Authentication

## 1. JWT Authentication ✅ COMPLETED

- [x] 1.1 POST /api/auth/register (Implemented in User Management)
- [x] 1.2 POST /api/auth/login ✅
- [x] 1.3 POST /api/auth/logout ✅
- [x] 1.4 POST /api/auth/refresh ✅
- [x] 1.5 GET /api/auth/me ✅
- [x] 1.6 Configure JWT with custom JWTService ✅

## 2. Token Configuration ✅ COMPLETED

- [x] 2.1 Set token TTL (configured via Sanctum) ✅
- [x] 2.2 Set refresh TTL (configured via Sanctum) ✅
- [x] 2.3 Include user_id, tenant_id in claims ✅

## 3. Password Reset 🚧 IN PROGRESS

- [ ] 3.1 POST /api/auth/password/forgot
- [ ] 3.2 POST /api/auth/password/reset
- [ ] 3.3 Create password_reset_tokens table
- [ ] 3.4 Send reset email with token

## 4. MFA Setup

- [ ] 4.1 Create user_mfa table
- [ ] 4.2 POST /api/auth/mfa/setup (generate secret)
- [ ] 4.3 POST /api/auth/mfa/verify (verify and enable)
- [ ] 4.4 POST /api/auth/mfa/disable
- [ ] 4.5 Generate recovery codes

## 5. MFA Login Flow

- [ ] 5.1 Check if MFA enabled on login
- [ ] 5.2 Return mfa_required flag
- [ ] 5.3 POST /api/auth/mfa/challenge

## 6. Rate Limiting

- [ ] 6.1 Configure login rate limit (5/minute)
- [ ] 6.2 Configure reset rate limit (3/minute)
- [ ] 6.3 Return 429 with retry-after

## 7. Account Lockout

- [ ] 7.1 Track failed login attempts
- [ ] 7.2 Lock after 5 failures
- [ ] 7.3 Auto-unlock after 30 minutes

## 8. Angular Auth Service

- [ ] 8.1 Create AuthService
- [ ] 8.2 Token storage (localStorage or sessionStorage)
- [ ] 8.3 Auto-refresh logic
- [ ] 8.4 HTTP interceptor for token

## 9. Auth UI Pages

- [ ] 9.1 LoginComponent
- [ ] 9.2 RegisterComponent
- [ ] 9.3 ForgotPasswordComponent
- [ ] 9.4 ResetPasswordComponent
- [ ] 9.5 MFA challenge input

## 10. Profile Security UI

- [ ] 10.1 ChangePasswordComponent
- [ ] 10.2 MfaSetupComponent with QR code
- [ ] 10.3 RecoveryCodesComponent

## 11. Testing

- [ ] 11.1 PHPUnit tests for auth endpoints
- [ ] 11.2 Test MFA flow
- [ ] 11.3 Angular auth tests
