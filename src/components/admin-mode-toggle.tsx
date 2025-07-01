
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

export function AdminModeToggle() {
  const { isAdmin, login, logout } = useAdmin();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [pin, setPin] = React.useState('');

  const handleSwitchChange = (checked: boolean) => {
    if (checked) {
      // Trying to enable admin mode
      setIsDialogOpen(true);
    } else {
      // Disabling admin mode
      logout();
      toast({ title: 'Admin mode disabled.' });
    }
  };

  const handlePinSubmit = () => {
    if (login(pin)) {
      toast({ title: 'Admin mode enabled.' });
      setIsDialogOpen(false);
      setPin('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect PIN',
        description: 'Please try again.',
      });
      setPin('');
    }
  };

  const handleDialogClose = (open: boolean) => {
      if (!open) {
          setIsDialogOpen(false);
          setPin('');
      }
  }

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
          <DialogHeader>
            <DialogTitle>Enter Admin PIN</DialogTitle>
            <DialogDescription>
              Enter the 4-digit PIN to enable admin mode.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pin" className="text-right">
                PIN
              </Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="col-span-3"
                maxLength={4}
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handlePinSubmit}>
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
