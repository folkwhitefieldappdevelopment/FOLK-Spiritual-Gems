
'use client';

import * as React from 'react';
import { Lock, Unlock } from 'lucide-react';
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

const ADMIN_PIN = "3690";

export function AdminModeToggle() {
  const { isAdmin, setAdmin } = useAdmin();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [pin, setPin] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);

  const resetState = () => {
    setPin('');
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

  const handlePinSubmit = async () => {
    setIsVerifying(true);
    if (pin === ADMIN_PIN) {
      setAdmin(true);
      toast({ title: 'Admin mode enabled.' });
      setIsDialogOpen(false);
      resetState();
    } else {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'The PIN you entered is incorrect.' });
      setIsVerifying(false);
      setPin('');
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
        <Label htmlFor="admin-mode-switch" className="hidden sm:inline">Admin Mode</Label>
        <Switch
          id="admin-mode-switch"
          checked={isAdmin}
          onCheckedChange={handleSwitchChange}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Admin PIN</DialogTitle>
            <DialogDescription>
              Enter the 4-digit PIN to unlock admin mode.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pin-input" className="text-right">
                PIN
              </Label>
              <Input
                id="pin-input"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                maxLength={4}
                placeholder="e.g. 1234"
                disabled={isVerifying}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handlePinSubmit} disabled={isVerifying}>
              {isVerifying ? 'Verifying...' : 'Unlock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
