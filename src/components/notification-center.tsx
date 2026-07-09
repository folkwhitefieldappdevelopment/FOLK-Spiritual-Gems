'use client';

import * as React from 'react';
import { Bell, Check, Clock, Loader2, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { markNotificationAsRead, clearAllNotifications } from '@/services/notification-history-service';
import { sendNotification } from '@/lib/notification-service';
import type { AppNotification } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function NotificationCenter() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);
  const initialLoadDone = React.useRef(false);

  React.useEffect(() => {
    if (!appUser) return;
    
    const historyRef = collection(db, 'users', appUser.id, 'notifications');
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const history = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      
      // Trigger browser push notifications for new arrivals after initial load
      if (initialLoadDone.current) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newNotif = change.doc.data() as AppNotification;
            // Only notify for unread messages that aren't old
            if (!newNotif.isRead) {
              const title = newNotif.type === 'alarm' ? `🔔 Call Reminder: ${newNotif.title}` : `📢 Broadcast: ${newNotif.title}`;
              sendNotification(title, {
                body: newNotif.message,
                tag: change.doc.id, // Deduplicate across tabs
                data: { personId: newNotif.personId },
                timestamp: new Date(newNotif.timestamp).getTime()
              });
            }
          }
        });
      }

      setNotifications(history);
      setIsLoading(false);
      initialLoadDone.current = true;
    }, (err) => {
      console.error("Notification listener error", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [appUser]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    if (!appUser) return;
    await markNotificationAsRead(appUser.id, id);
  };

  const handleClearAll = async () => {
    if (!appUser) return;
    await clearAllNotifications(appUser.id);
  };

  const handleAction = (n: AppNotification) => {
    handleMarkAsRead(n.id);
    if (n.personId) {
      router.push(`/contacts/profile?id=${n.personId}`);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-accent text-accent-foreground text-[10px]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive">
              Clear All
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map(n => (
                <div 
                  key={n.id} 
                  className={cn(
                    "flex flex-col p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer",
                    !n.isRead && "bg-primary/5"
                  )}
                  onClick={() => handleAction(n)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        {n.type === 'alarm' && <Phone className="h-3 w-3 text-primary" />}
                        <p className={cn("text-sm font-medium leading-none", !n.isRead && "text-primary")}>{n.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      {n.senderName && (
                        <p className="text-[10px] text-muted-foreground italic">Sent by: {n.senderName}</p>
                      )}
                    </div>
                    {!n.isRead && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center text-[10px] text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                    </div>
                    {!n.isRead && (
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id); }}>
                        <Check className="mr-1 h-3 w-3" /> Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
              <Bell className="h-8 w-8 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
