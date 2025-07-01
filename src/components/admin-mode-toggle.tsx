
'use client';

import * as React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getAdminPhoneNumbers } from '@/services/settings-service';
import { useAdmin } from '@/contexts/admin-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from './ui/switch';

export function AdminModeToggle() {
  const { isAdmin, setAdmin } = useAdmin();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [step, setStep] = React.useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);
  
  const recaptchaContainerRef = React.useRef<HTMLDivElement>(null);

  const resetState = () => {
    setStep('phone');
    setPhoneNumber('');
    setOtp('');
    setConfirmationResult(null);
    setIsVerifying(false);
  };

  const handleSwitchChange = (checked: boolean) => {
    if (checked) {
      setIsDialogOpen(true);
    } else {
      setAdmin(false);
      toast({ title: 'Admin mode disabled.' });
    }
  };

  const handlePhoneSubmit = async () => {
    setIsVerifying(true);
    if (!phoneNumber) {
      toast({ variant: 'destructive', title: 'Phone number is required.' });
      setIsVerifying(false);
      return;
    }
    
    if (!recaptchaContainerRef.current) {
        toast({ variant: 'destructive', title: 'reCAPTCHA Error', description: 'Container element not found.' });
        setIsVerifying(false);
        return;
    }

    try {
      const adminNumbers = await getAdminPhoneNumbers();
      if (!adminNumbers.includes(phoneNumber)) {
        toast({ variant: 'destructive', title: 'This number is not authorized.' });
        setIsVerifying(false);
        return;
      }
      
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        'size': 'invisible',
        'callback': () => {},
      });

      const fullPhoneNumber = `+91${phoneNumber}`; 
      const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
      
      setConfirmationResult(confirmation);
      setStep('otp');
      toast({ title: 'OTP Sent', description: 'An OTP has been sent to your phone.'});

    } catch (error: any) {
      console.error("Error sending OTP:", error);
      let description = 'Please check your Firebase configuration and try again.';
      
      if (error.code === 'auth/operation-not-allowed') {
          description = 'Phone sign-in is not enabled in your Firebase project. Go to Firebase Console > Authentication > Sign-in method to fix this.';
      } else if (error.code === 'auth/captcha-check-failed') {
          description = "Your app's domain (localhost) is not authorized. Please double-check that 'localhost' is in the Authorized Domains list in Firebase > Authentication > Settings. Also, ensure you're using the correct Firebase project credentials.";
      } else if (error.code === 'auth/invalid-phone-number') {
          description = 'The phone number you entered is not valid.';
      }

      toast({ 
          variant: 'destructive', 
          title: 'Failed to send OTP', 
          description: description
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!confirmationResult || !otp) return;
    setIsVerifying(true);
    try {
      await confirmationResult.confirm(otp);
      setAdmin(true);
      toast({ title: 'Admin mode enabled.' });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      let description = 'The code you entered is incorrect.';
      if (error.code === 'auth/code-expired') {
        description = 'The OTP has expired. Please request a new one.';
      } else if (error.code === 'auth/invalid-verification-code') {
        description = 'The code you entered is incorrect. Please try again.';
      }
      toast({ variant: 'destructive', title: 'Invalid OTP', description: description });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false);
      resetState();
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {isAdmin ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        <Label htmlFor="admin-mode-switch">Admin Mode</Label>
        <Switch
          id="admin-mode-switch"
          checked={isAdmin}
          onCheckedChange={handleSwitchChange}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          {step === 'phone' ? (
            <>
              <DialogHeader>
                <DialogTitle>Enter Admin Phone Number</DialogTitle>
                <DialogDescription>
                  An OTP will be sent to the authorized phone number.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone-number" className="text-right">
                    Phone
                  </Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="col-span-3"
                    onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                    placeholder="e.g. 7355585913"
                    disabled={isVerifying}
                  />
                </div>
                 <div ref={recaptchaContainerRef}></div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handlePhoneSubmit} disabled={isVerifying}>
                  {isVerifying ? 'Sending...' : 'Send OTP'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Enter OTP</DialogTitle>
                <DialogDescription>
                  Enter the 6-digit code sent to +91{phoneNumber}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="otp" className="text-right">
                    OTP
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="col-span-3"
                    onKeyDown={(e) => e.key === 'Enter' && handleOtpSubmit()}
                    maxLength={6}
                    placeholder="e.g. 123456"
                    disabled={isVerifying}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep('phone')} disabled={isVerifying}>
                  Back
                </Button>
                <Button type="submit" onClick={handleOtpSubmit} disabled={isVerifying}>
                  {isVerifying ? 'Verifying...' : 'Unlock'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
