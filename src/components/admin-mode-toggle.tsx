
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
  const [phoneNumber, setPhoneNumber] = React.useState('');

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

  const handleLoginSubmit = async () => {
    const success = await login(phoneNumber);
    if (success) {
      toast({ title: 'Admin mode enabled.' });
      setIsDialogOpen(false);
      setPhoneNumber('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Phone Number',
        description: 'This number is not authorized for admin access.',
      });
      setPhoneNumber('');
    }
  };

  const handleDialogClose = (open: boolean) => {
      if (!open) {
          setIsDialogOpen(false);
          setPhoneNumber('');
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
            <DialogTitle>Enter Admin Phone Number</DialogTitle>
            <DialogDescription>
              Enter an authorized phone number to enable admin mode.
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
                onKeyDown={(e) => e.key === 'Enter' && handleLoginSubmit()}
                placeholder="e.g. 7355585913"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleLoginSubmit}>
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
