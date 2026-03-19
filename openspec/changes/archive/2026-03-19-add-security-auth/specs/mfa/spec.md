## ADDED Requirements

### Requirement: MFA Setup Endpoint
The system SHALL provide MFA setup.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/mfa/setup | Generate secret |

#### Scenario: Generate secret
- **WHEN** user requests MFA setup
- **THEN** secret and QR code URL returned

---

### Requirement: MFA Verify Endpoint
The system SHALL verify and enable MFA.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/mfa/verify | Verify and enable |

**Request:**
- code: required, 6-digit TOTP

#### Scenario: Valid code
- **WHEN** correct TOTP code provided
- **THEN** MFA is enabled and recovery codes returned

#### Scenario: Invalid code
- **WHEN** wrong code provided
- **THEN** HTTP 422 with error

---

### Requirement: MFA Disable Endpoint
The system SHALL allow disabling MFA.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/mfa/disable | Disable MFA |

**Request:**
- password: required (verify identity)

#### Scenario: Disable MFA
- **WHEN** correct password provided
- **THEN** MFA is disabled

---

### Requirement: MFA Challenge on Login
The system SHALL require MFA verification on login.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/mfa/challenge | Verify MFA code |

#### Scenario: MFA required on login
- **WHEN** user with MFA enabled logs in
- **THEN** mfa_required flag returned instead of token

#### Scenario: Submit MFA code
- **WHEN** correct TOTP code provided
- **THEN** full access token issued

#### Scenario: Use recovery code
- **WHEN** recovery code used
- **THEN** access granted and code consumed

---

### Requirement: User MFA Data Model
The system SHALL store MFA configuration.

**user_mfa table:**
- user_id: UUID primary key
- secret: encrypted TOTP secret
- enabled: boolean
- recovery_codes: JSON array (hashed)
- enabled_at: timestamp

#### Scenario: Store MFA secret
- **WHEN** MFA setup initiated
- **THEN** secret stored encrypted

---

### Requirement: MFA Setup UI
The Angular application SHALL provide MFA setup.

#### Scenario: Show QR code
- **WHEN** user enables MFA
- **THEN** QR code displayed for scanning

#### Scenario: Enter verification code
- **WHEN** QR code shown
- **THEN** input for verification code available

#### Scenario: Show recovery codes
- **WHEN** MFA enabled successfully
- **THEN** recovery codes displayed for saving
