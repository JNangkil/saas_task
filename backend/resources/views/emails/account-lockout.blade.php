<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Lockout Notification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #f8d7da;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
            border: 1px solid #f5c6cb;
        }
        .content {
            background-color: #ffffff;
            padding: 30px;
            border: 1px solid #e9ecef;
            border-top: none;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 5px 5px;
            font-size: 12px;
            color: #6c757d;
        }
        .alert {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .security-info {
            background-color: #d1ecf1;
            border: 1px solid #bee5eb;
            border-left: 4px solid #17a2b8;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box {
            background-color: #e2e3e5;
            border: 1px solid #d6d8db;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .emphasis {
            font-weight: bold;
            color: #dc3545;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 Account Security Alert</h1>
    </div>
    
    <div class="content">
        <p>Hello {{ $user->name }},</p>
        
        <div class="alert">
            <p><strong>Your account has been temporarily locked due to multiple failed login attempts.</strong></p>
        </div>
        
        <p>We detected <span class="emphasis">{{ $failedAttempts }}</span> unsuccessful login attempts to your account, with the last attempt occurring at {{ $lastFailedAt->format('g:i A on F j, Y') }}.</p>
        
        <div class="info-box">
            <p><strong>Lockout Details:</strong></p>
            <ul>
                <li><strong>Failed Attempts:</strong> {{ $failedAttempts }}</li>
                <li><strong>Account Locked Until:</strong> {{ $lockedUntil->format('g:i A on F j, Y') }}</li>
                <li><strong>Lockout Duration:</strong> {{ $lockoutDuration }} minutes</li>
            </ul>
        </div>
        
        <div class="security-info">
            <p><strong>Security Recommendations:</strong></p>
            <ul>
                <li>If you recognize these login attempts, please wait for the lockout to expire and try again with the correct password.</li>
                <li>If you don't recognize these attempts, your account may be under attack. Consider changing your password immediately after the lockout expires.</li>
                <li>Ensure your password is strong and unique to this account.</li>
                <li>Enable two-factor authentication (MFA) if you haven't already done so.</li>
                <li>Never share your login credentials with anyone.</li>
            </ul>
        </div>
        
        <p><strong>What happens next?</strong></p>
        <p>Your account will automatically unlock after the lockout period expires. You can then attempt to log in again.</p>
        
        <p>If you believe this is an error or need immediate assistance, please contact our support team at <a href="mailto:{{ $supportEmail }}">{{ $supportEmail }}</a>.</p>
        
        <p>For your security, we've temporarily disabled password reset requests during this lockout period to prevent unauthorized access.</p>
    </div>
    
    <div class="footer">
        <p>This is an automated security message. Please do not reply to this email.</p>
        <p>If you didn't attempt to log in recently, please review your account security immediately.</p>
        <p>&copy; {{ date('Y') }} {{ config('app.name', 'Our Application') }}. All rights reserved.</p>
    </div>
</body>
</html>