import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LaravelAdapter } from '@/auth/adapters/laravel-adapter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Smartphone, Loader2, Copy, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const mfaSetupSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  code: z.string().min(6, 'Verification code must be 6 digits'),
});

type MfaSetupSchema = z.infer<typeof mfaSetupSchema>;

interface MfaSetupData {
  secret: string;
  qr_code: string;
  recovery_codes: string[];
}

export function MfaSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'password' | 'scan'>('password');
  const [mfaData, setMfaData] = useState<MfaSetupData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const form = useForm<MfaSetupSchema>({
    resolver: zodResolver(mfaSetupSchema),
    defaultValues: {
      password: '',
      code: '',
    },
  });

  const onPasswordSubmit = async (values: { password: string }) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const data = await LaravelAdapter.setupMfa(values.password);
      setMfaData(data);
      setStep('scan');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to setup MFA. Please check your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCodeSubmit = async (values: MfaSetupSchema) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await LaravelAdapter.enableMfa(values.code);
      toast.success('Two-factor authentication has been enabled for your account.');
      navigate('/app/profile');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySecretToClipboard = () => {
    if (mfaData?.secret) {
      navigator.clipboard.writeText(mfaData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          Back
        </Button>

        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Setup Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enhance your account security by enabling 2FA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 'password' && (
              <form onSubmit={form.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Confirm Your Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    {...form.register('password')}
                    disabled={isSubmitting}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
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
                      Setting up...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </form>
            )}

            {step === 'scan' && mfaData && (
              <form onSubmit={form.handleSubmit(onCodeSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <div className="rounded-lg border bg-white p-6">
                    <h3 className="mb-4 font-semibold">Step 1: Scan QR Code</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
                    </p>
                    <div className="flex justify-center">
                      <div dangerouslySetInnerHTML={{ __html: mfaData.qr_code }} />
                    </div>
                  </div>

                  <div className="rounded-lg border bg-white p-6">
                    <h3 className="mb-4 font-semibold">Step 2: Or Enter Code Manually</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      If you can't scan the QR code, enter this code manually in your authenticator app:
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={mfaData.secret}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={copySecretToClipboard}
                      >
                        {copiedSecret ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-white p-6">
                    <h3 className="mb-4 font-semibold">Step 3: Verify Setup</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Enter the 6-digit code from your authenticator app to complete the setup:
                    </p>
                    <div className="space-y-2">
                      <Input
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
                  </div>

                  {mfaData.recovery_codes && mfaData.recovery_codes.length > 0 && (
                    <Alert className="border-yellow-500 bg-yellow-50">
                      <AlertDescription className="text-sm">
                        <strong>Important:</strong> Save these recovery codes in a safe place. 
                        You can use them to access your account if you lose access to your authenticator device.
                      </AlertDescription>
                    </Alert>
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
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Enable Two-Factor Authentication
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
