<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workspace Invitation</title>
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
        .message-box {
            background-color: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #007bff;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>You're Invited!</h1>
    </div>
    
    <div class="content">
        <p>Hello,</p>
        
        <p>{{ $invitedBy->name }} has invited you to join the <strong>{{ $workspace->name }}</strong> workspace with the role of <strong>{{ ucfirst($invitation->role) }}</strong>.</p>
        
        @if($invitation->message)
        <div class="message-box">
            <p><strong>Personal message:</strong></p>
            <p>{{ $invitation->message }}</p>
        </div>
        @endif
        
        <p>This invitation will expire in 7 days.</p>
        
        <p>
            <a href="{{ url('/invitations/' . $invitation->token) }}" class="button">View Invitation</a>
        </p>
        
        <p>If you don't have an account yet, you'll be able to register after viewing the invitation.</p>
        
        <p>If you're not interested in this invitation, you can simply ignore this email.</p>
    </div>
    
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
    </div>
</body>
</html>