import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const mfaVerifySchema = z.object({
  code: z.string().min(6, 'Verification code must be 6 digits'),
});

type MfaVerifySchema = z.infer<typeof mfaVerifySchema>;

export function MfaVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyMfa, mfaEmail } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const form = useForm<MfaVerifySchema>({
    resolver: zodResolver(mfaVerifySchema),
    defaultValues: {
      code: '',
    },
  });

  const onSubmit = async (values: MfaVerifySchema) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await verifyMfa(values.code);

      // Get the next URL from search params or default to /app
      const next = searchParams.get('next') || '/app';
      navigate(next, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    // This would call the backend to resend the code
    setResendSuccess(true);
    setTimeout(() => setResendSuccess(false), 5000);
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

        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your authenticator app to complete sign in.
            </CardDescription>
            {mfaEmail && (
              <p className="mt-2 text-sm text-muted-foreground">
                Signing in as <span className="font-medium">{mfaEmail}</span>
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {resendSuccess && (
                <Alert className="border-green-500 text-green-700 bg-green-50">
                  <AlertDescription>A new code has been sent to your device.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  className="text-center text-lg tracking-widest"
                  {...form.register('code')}
                  disabled={isSubmitting}
                  autoFocus
                />
                {form.formState.errors.code && (
                  <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-muted-foreground"
                  onClick={handleResendCode}
                  disabled={isSubmitting}
                >
                  Didn't receive a code? Resend
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
