## ADDED Requirements

### Requirement: User Entity Extensions
The system SHALL extend the User entity with profile attributes.

**Additional Attributes:**
- job_title: User's job title (nullable, max 100)
- timezone: User's timezone (default: UTC)
- locale: User's preferred locale (default: en)
- status: active or inactive (default: active)
- avatar_url: URL to user's avatar image (nullable)

#### Scenario: User with full profile
- **WHEN** a user has all profile fields set
- **THEN** the profile includes name, email, job_title, timezone, locale, avatar

---

### Requirement: User Profile API
The system SHALL expose REST API endpoints for user profile management.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/me | Get current user profile |
| PATCH | /api/users/me | Update profile |
| POST | /api/users/me/avatar | Upload avatar |
| DELETE | /api/users/me/avatar | Remove avatar |

#### Scenario: Get current user profile
- **WHEN** authenticated user requests GET /api/users/me
- **THEN** their full profile is returned

#### Scenario: Update profile
- **WHEN** user updates their name and timezone
- **THEN** profile is updated and returned

#### Scenario: Email change restricted
- **WHEN** user attempts to change email
- **THEN** email change requires verification

---

### Requirement: Profile Validation Rules
The system SHALL validate profile updates.

| Field | Rules |
|-------|-------|
| name | required, string, max:100 |
| job_title | nullable, string, max:100 |
| timezone | nullable, valid timezone |
| locale | nullable, in:supported_locales |

#### Scenario: Invalid timezone rejected
- **WHEN** user provides invalid timezone
- **THEN** HTTP 422 with validation error

---

### Requirement: User Avatar Management
The system SHALL support avatar upload and storage.

#### Scenario: Upload avatar
- **WHEN** user uploads an image file
- **THEN** image is resized and stored
- **AND** avatar_url is updated

#### Scenario: Avatar size limit
- **WHEN** upload exceeds 2MB
- **THEN** HTTP 422 with size error

#### Scenario: Avatar format validation
- **WHEN** non-image file is uploaded
- **THEN** HTTP 422 with format error

---

### Requirement: User Status
The system SHALL support active and inactive user statuses.

#### Scenario: Inactive user cannot login
- **WHEN** an inactive user attempts to authenticate
- **THEN** authentication is denied with appropriate error

#### Scenario: Inactive user excluded from assignments
- **WHEN** listing users for assignment
- **THEN** inactive users are not included

---

### Requirement: Angular Profile Page
The Angular application SHALL provide a ProfilePageComponent.

#### Scenario: Display profile form
- **WHEN** user navigates to profile page
- **THEN** form shows current profile values

#### Scenario: Save profile changes
- **WHEN** user edits and saves profile
- **THEN** changes are persisted via API

#### Scenario: Upload avatar
- **WHEN** user clicks avatar and selects image
- **THEN** avatar is uploaded and preview updates

---

### Requirement: Angular User Service
The Angular application SHALL provide a UserService.

#### Scenario: UserService methods
- **WHEN** the service is used
- **THEN** it provides getCurrentUser, updateProfile, uploadAvatar, and removeAvatar methods
