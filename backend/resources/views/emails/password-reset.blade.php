<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
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
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
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
        .button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .alert {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-left: 4px solid #f39c12;
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
    </style>
</head>
<body>
    <div class="header">
        <h1>Password Reset Request</h1>
    </div>
    
    <div class="content">
        <p>Hello {{ $user->name }},</p>
        
        <p>We received a request to reset the password for your account associated with this email address.</p>
        
        <p>
            <a href="{{ $resetUrl }}" class="button">Reset Your Password</a>
        </p>
        
        <div class="alert">
            <p><strong>Important:</strong> This link will expire in {{ $expirationMinutes }} minutes for security reasons.</p>
        </div>
        
        <div class="security-info">
            <p><strong>Security Information:</strong></p>
            <ul>
                <li>If you didn't request this password reset, please ignore this email.</li>
                <li>Your password will remain unchanged if you don't click the reset link.</li>
                <li>Never share this reset link with anyone.</li>
                <li>For your security, make sure to create a strong, unique password.</li>
            </ul>
        </div>
        
        <p>If the button above doesn't work, you can copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">{{ $resetUrl }}</p>
        
        <p>If you continue to have problems, please contact our support team.</p>
    </div>
    
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
    </div>
</body>
</html>