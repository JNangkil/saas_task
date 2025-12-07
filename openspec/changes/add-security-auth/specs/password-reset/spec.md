## ADDED Requirements

### Requirement: Forgot Password Endpoint
The system SHALL provide password reset request.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/password/forgot | Request reset |

**Request:**
- email: required, email

#### Scenario: Request reset
- **WHEN** valid email submitted
- **THEN** reset email sent with token link

#### Scenario: Unknown email
- **WHEN** email not found
- **THEN** still return success (security)

---

### Requirement: Reset Password Endpoint
The system SHALL provide password reset.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/password/reset | Reset password |

**Request:**
- token: required
- email: required
- password: required, min:8, confirmed

#### Scenario: Valid reset
- **WHEN** valid token and password
- **THEN** password is updated

#### Scenario: Expired token
- **WHEN** token is expired
- **THEN** HTTP 422 with error

#### Scenario: Invalid token
- **WHEN** token is invalid
- **THEN** HTTP 422 with error

---

### Requirement: Password Reset Tokens
The system SHALL store reset tokens securely.

**password_reset_tokens table:**
- email: primary key
- token: hashed token
- created_at: timestamp

**Token expires after 60 minutes**

#### Scenario: One token per email
- **WHEN** new reset requested
- **THEN** previous token is replaced

---

### Requirement: Reset Email Template
The system SHALL send reset emails with link.

#### Scenario: Email content
- **WHEN** reset email sent
- **THEN** includes secure link to reset page

---

### Requirement: Angular Reset Flow
The Angular application SHALL provide reset pages.

#### Scenario: Forgot password page
- **WHEN** user clicks forgot password
- **THEN** email input form is displayed

#### Scenario: Reset password page
- **WHEN** user clicks reset link
- **THEN** new password form is displayed

#### Scenario: Success message
- **WHEN** password is reset
- **THEN** success message and redirect to login
