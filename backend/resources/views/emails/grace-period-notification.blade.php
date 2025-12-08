<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grace Period Notification</title>
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
        .warning-box {
            background-color: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #dc3545;
            margin: 20px 0;
        }
        .warning-box.high {
            border-left-color: #dc3545;
            background-color: #f8d7da;
        }
        .warning-box.medium {
            border-left-color: #ffc107;
            background-color: #fff3cd;
        }
        .warning-box.low {
            border-left-color: #28a745;
            background-color: #d4edda;
        }
        .days-remaining {
            font-size: 24px;
            font-weight: bold;
            color: #dc3545;
            text-align: center;
            margin: 20px 0;
        }
        .days-remaining.medium {
            color: #ffc107;
        }
        .days-remaining.low {
            color: #28a745;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Subscription Grace Period Notice</h1>
    </div>
    
    <div class="content">
        <p>Hello,</p>
        
        <p>This is a notification regarding your subscription for <strong>{{ $plan->name ?? 'Your Plan' }}</strong>.</p>
        
        <div class="warning-box {{ $urgencyLevel }}">
            <p><strong>{{ $warningMessage }}</strong></p>
        </div>
        
        <div class="days-remaining {{ $urgencyLevel }}">
            {{ $daysRemaining }} {{ $daysRemaining == 1 ? 'day' : 'days' }} remaining
        </div>
        
        <p><strong>Grace period ends on:</strong> {{ $gracePeriodEndsAt }}</p>
        
        <p>
            <a href="{{ url('/billing/subscription') }}" class="button">Manage Subscription</a>
        </p>
        
        <p>To continue using our service without interruption, please update your payment information or reactivate your subscription.</p>
        
        <p>If you have any questions or need assistance, please contact our support team.</p>
        
        @if($dayNumber == 1)
        <div class="warning-box high">
            <p><strong>Important:</strong> This is your final warning. Your subscription will expire tomorrow if no action is taken.</p>
        </div>
        @endif
    </div>
    
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>If you no longer wish to receive these notifications, please update your subscription settings.</p>
    </div>
</body>
</html>