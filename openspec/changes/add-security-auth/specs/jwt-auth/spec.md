## ADDED Requirements

### Requirement: User Registration
The system SHALL provide user registration endpoint.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |

**Request:**
- name: required, string
- email: required, email, unique
- password: required, min:8, confirmed

#### Scenario: Successful registration
- **WHEN** valid registration data submitted
- **THEN** user is created and token returned

#### Scenario: Duplicate email
- **WHEN** email already exists
- **THEN** HTTP 422 with validation error

---

### Requirement: User Login
The system SHALL provide login endpoint.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Authenticate user |

**Request:**
- email: required
- password: required

#### Scenario: Successful login
- **WHEN** valid credentials provided
- **THEN** JWT access and refresh tokens returned

#### Scenario: Invalid credentials
- **WHEN** wrong password provided
- **THEN** HTTP 401 Unauthorized

#### Scenario: Account locked
- **WHEN** account is locked due to failed attempts
- **THEN** HTTP 423 Locked with retry time

---

### Requirement: Token Refresh
The system SHALL provide token refresh endpoint.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/refresh | Refresh access token |

#### Scenario: Valid refresh
- **WHEN** valid refresh token provided
- **THEN** new access token returned

---

### Requirement: Logout
The system SHALL provide logout endpoint.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/logout | Invalidate token |

#### Scenario: Logout
- **WHEN** logout requested
- **THEN** token is invalidated

---

### Requirement: Current User Endpoint
The system SHALL provide current user info.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/me | Get current user |

#### Scenario: Get current user
- **WHEN** authenticated request
- **THEN** user info with permissions returned

---

### Requirement: Rate Limiting
The system SHALL rate limit auth endpoints.

| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/login | 5 | 1 minute |
| /auth/register | 3 | 1 minute |

#### Scenario: Rate limit exceeded
- **WHEN** rate limit exceeded
- **THEN** HTTP 429 with Retry-After header

---

### Requirement: Account Lockout
The system SHALL lock accounts after failed attempts.

#### Scenario: Lock after failures
- **WHEN** 5 consecutive failed logins
- **THEN** account locked for 30 minutes

#### Scenario: Notify on lockout
- **WHEN** account is locked
- **THEN** email notification sent

---

### Requirement: Angular Auth Service
The Angular application SHALL provide authentication service.

#### Scenario: AuthService methods
- **WHEN** the service is used
- **THEN** it provides login, register, logout, refreshToken, getCurrentUser methods

---

### Requirement: Auth UI Pages
The Angular application SHALL provide auth pages.

#### Scenario: Login page
- **WHEN** user navigates to login
- **THEN** login form is displayed

#### Scenario: Register page
- **WHEN** user navigates to register
- **THEN** registration form is displayed
