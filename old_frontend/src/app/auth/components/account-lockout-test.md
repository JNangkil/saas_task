# Account Lockout Implementation Test Guide

## Testing Scenarios

### 1. Normal Login Flow
1. Enter correct credentials
2. Verify successful login and navigation to workspaces
3. Verify no lockout messages are displayed

### 2. Failed Login Attempts
1. Enter incorrect credentials
2. Verify warning message appears showing remaining attempts
3. Repeat until account is locked (typically 5 attempts)
4. Verify account lockout message appears with countdown timer

### 3. Account Lockout State
1. Verify login form is disabled when account is locked
2. Verify countdown timer shows remaining time
3. Verify "Reset Password" button is available
4. Verify form remains disabled until lockout expires

### 4. MFA Verification with Lockout
1. Start login process with correct credentials but require MFA
2. Navigate to MFA verification page
3. Enter incorrect MFA codes multiple times
4. Verify account becomes locked during MFA verification
5. Verify MFA form is disabled when locked
6. Verify appropriate lockout messages are displayed

### 5. Lockout Expiration
1. Wait for lockout to expire (or modify localStorage to simulate expiration)
2. Verify forms become enabled again
3. Verify login attempts work normally after expiration

### 6. Password Reset from Lockout
1. When account is locked, click "Reset Password" button
2. Verify navigation to forgot password page
3. Verify password reset flow works normally

## Implementation Features

### AuthService Changes
- ✅ Handles HTTP 423 (Locked) responses
- ✅ Extracts retry time from lockout response
- ✅ Provides methods to check lockout status
- ✅ Includes lockout information in error handling
- ✅ Stores lockout state in localStorage
- ✅ Automatically clears expired lockouts

### Login Component Changes
- ✅ Handles account lockout responses
- ✅ Displays lockout message with remaining time
- ✅ Shows countdown timer for lockout duration
- ✅ Provides information about when they can try again
- ✅ Includes link to password reset
- ✅ Disables form when account is locked

### MFA Verify Component Changes
- ✅ Handles account lockout responses
- ✅ Displays appropriate lockout messages
- ✅ Disables form when account is locked

### Shared Lockout Component
- ✅ Displays countdown timer
- ✅ Shows lockout reason
- ✅ Provides helpful information
- ✅ Responsive design
- ✅ Real-time countdown updates
- ✅ Progress bar visualization

### TypeScript Interfaces
- ✅ AccountLockoutResponse interface
- ✅ InvalidCredentialsResponse interface
- ✅ LockoutState interface
- ✅ LockoutInfo interface
- ✅ Updated error handling types

## Browser Console Testing

You can test the lockout functionality by simulating lockout state in the browser console:

```javascript
// Simulate account lockout for 5 minutes
const lockoutState = {
    isLocked: true,
    lockedUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    retryAfter: 300,
    failedAttempts: 5
};
localStorage.setItem('lockout_state', JSON.stringify(lockoutState));

// Refresh the page to see the lockout UI
```

```javascript
// Clear lockout state
localStorage.removeItem('lockout_state');

// Refresh the page to see normal login UI