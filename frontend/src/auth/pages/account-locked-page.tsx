import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LaravelAdapter } from '@/auth/adapters/laravel-adapter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Clock, ArrowLeft } from 'lucide-react';

export function AccountLockedPage() {
  const navigate = useNavigate();
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    // Get initial remaining time
    const updateRemainingTime = () => {
      const time = LaravelAdapter.getRemainingLockoutTime();
      setRemainingTime(time);
      
      // If lockout has expired, redirect to login
      if (time === 0) {
        navigate('/auth/signin', { replace: true });
      }
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate('/auth/signin')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign In
        </Button>

        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Account Temporarily Locked</AlertTitle>
          <AlertDescription>
            Your account has been locked due to multiple failed sign in attempts.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Please Wait</CardTitle>
            <CardDescription>
              For your security, we've temporarily locked your account. You can try signing in again after the countdown below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <div className="text-4xl font-bold text-gray-900">
                {formatTime(remainingTime)}
              </div>
              <p className="mt-2 text-sm text-gray-600">remaining until unlock</p>
            </div>

            <div className="space-y-2 rounded-lg bg-blue-50 p-4">
              <h4 className="font-semibold text-blue-900">What should I do?</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
                <li>Wait for the lockout period to expire</li>
                <li>Make sure you're using the correct email and password</li>
                <li>Reset your password if you've forgotten it</li>
                <li>Contact support if you believe this is an error</li>
              </ul>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/auth/forgot-password')}
            >
              Forgot Password?
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
