
'use client';

import * as React from 'react';
import { Megaphone, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAppToast } from '@/contexts/toast-context';
import { broadcastNotification } from '@/services/notification-history-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { userRoles, type UserRole } from '@/lib/types';

export function BroadcastNotificationCard() {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  
  const [title, setTitle] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [selectedRoles, setSelectedRoles] = React.useState<UserRole[]>(['Folk Guide', 'Folk Enabler']);
  const [isSending, setIsSending] = React.useState(false);

  const handleToggleRole = (role: UserRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSend = async () => {
    if (!appUser) return;
    if (!title.trim() || !message.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title and message are required.' });
      return;
    }
    if (selectedRoles.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Select at least one target group.' });
      return;
    }

    setIsSending(true);
    try {
      await broadcastNotification(
        { id: appUser.id, name: appUser.name, role: appUser.role },
        { title, message, targetRoles: selectedRoles }
      );
      toast({ title: 'Notification Sent', description: `Broadcasted to ${selectedRoles.join(', ')}.` });
      setTitle('');
      setMessage('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to send notification.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Broadcast Notification
        </CardTitle>
        <CardDescription>
          Send a custom notification to specific groups of users. This will appear in their Notification Center.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="broadcast-title">Notification Title</Label>
          <Input 
            id="broadcast-title" 
            placeholder="e.g. Important Update, Meeting Canceled" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="broadcast-message">Message</Label>
          <Textarea 
            id="broadcast-message" 
            placeholder="Write your message here..." 
            className="min-h-[100px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="space-y-3">
          <Label>Target Groups</Label>
          <div className="flex flex-wrap gap-4">
            {userRoles.map((role) => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox 
                  id={`role-${role}`} 
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={() => handleToggleRole(role)}
                />
                <Label htmlFor={`role-${role}`} className="text-sm font-normal cursor-pointer">
                  {role}s
                </Label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Broadcast
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
