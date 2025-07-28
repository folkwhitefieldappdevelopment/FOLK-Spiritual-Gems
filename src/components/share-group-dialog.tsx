
"use client";

import * as React from "react";
import type { Person, Group } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Copy, Share } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "./ui/textarea";

type ShareGroupDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  group: Group;
  members: Person[];
};

export function ShareGroupDialog({
  isOpen,
  setIsOpen,
  group,
  members,
}: ShareGroupDialogProps) {
  const [inviteLink, setInviteLink] = React.useState("");
  const { toast } = useToast();

  const inviteMessage = `Hi {name}, you're invited to join our WhatsApp group: ${group.name}. Please use this link to join: ${inviteLink}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied to clipboard!" });
    });
  };
  
  const allNumbersString = React.useMemo(() => {
      if (members.length === 0) return "";
      return members.map(p => p.phone).join(', ');
  }, [members]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share or Add to WhatsApp Group</DialogTitle>
          <DialogDescription>
            Copy all numbers to add members directly, or share the invite link individually.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <Label htmlFor="add-members">1. Add all members to a new group</Label>
            <p className="text-xs text-muted-foreground">Select and copy the numbers below. Then, in WhatsApp, create a group and paste this list into the 'Add participants' field.</p>
             <Textarea
                readOnly
                value={allNumbersString}
                className="h-24 bg-background font-mono text-xs"
                placeholder="No members in this group to copy numbers from."
              />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-link">2. Or, share an invite link individually</Label>
            <Input
              id="invite-link"
              placeholder="Paste your WhatsApp Group Invite Link here, e.g., https://chat.whatsapp.com/..."
              value={inviteLink}
              onChange={(e) => setInviteLink(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Share link with members</Label>
            <ScrollArea className="h-60 w-full rounded-md border">
              <div className="p-4 space-y-2">
                {members.map((person) => {
                  const message = inviteMessage.replace('{name}', person.fullName);
                  const whatsAppLink = `https://wa.me/91${person.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`;
                  
                  return (
                    <div key={person.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={person.photoUrl} alt={person.fullName} />
                          <AvatarFallback>{person.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{person.fullName}</p>
                          <p className="text-xs text-muted-foreground">{person.phone}</p>
                        </div>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        disabled={!inviteLink}
                      >
                        <a href={whatsAppLink} target="_blank" rel="noopener noreferrer">
                          <Share className="mr-2 h-4 w-4" /> Share Link
                        </a>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
