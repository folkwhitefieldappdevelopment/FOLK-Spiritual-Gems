
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
import { useAuth } from "@/contexts/auth-context";

const DEFAULT_WHATSAPP_TEMPLATE = "Hare Krishna {name}, we are inviting you for our upcoming spiritual session. Hope to see you there!";

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
  const { appUser } = useAuth();

  const getWhatsAppLink = (person: Person) => {
    if (!appUser) return "#";
    const template = appUser.whatsAppTemplate || DEFAULT_WHATSAPP_TEMPLATE;
    const personalizedInvite = `Hi {name}, you're invited to join our WhatsApp group: ${group.name}. Please use this link to join: ${inviteLink}`;
    // Using a more specific invite message for group sharing
    const message = inviteLink ? personalizedInvite.replace('{name}', person.fullName) : template.replace('{name}', person.fullName);
    return `https://wa.me/91${person.phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied to clipboard!" });
    });
  };
  
  const allNumbersString = React.useMemo(() => {
      if (members.length === 0) return "";
      // Prepend +91 country code and separate with newlines for better compatibility
      return members.map(p => `+91${p.phone}`).join('\n');
  }, [members]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share or Add to WhatsApp Group</DialogTitle>
          <DialogDescription>
            Use one of the methods below to add members to a WhatsApp group.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <Label htmlFor="add-members" className="font-semibold">1. Add all members to a new group</Label>
            <div className="text-xs text-muted-foreground space-y-1">
                <p>1. Select and copy the numbers from the box below.</p>
                <p>2. Open WhatsApp (desktop is recommended) and tap on **"New Group"**.</p>
                <p>3. In the "Add participants" screen, **paste the list** into the search field.</p>
                <p>4. WhatsApp will then display the contacts for you to add.</p>
            </div>
             <Textarea
                id="add-members"
                readOnly
                value={allNumbersString}
                className="h-24 bg-background font-mono text-xs"
                placeholder="No members in this group to copy numbers from."
              />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-link" className="font-semibold">2. Or, share an invite link individually</Label>
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
                {members.length > 0 ? (
                    members.map((person) => (
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
                            <a href={getWhatsAppLink(person)} target="_blank" rel="noopener noreferrer">
                            <Share className="mr-2 h-4 w-4" /> Share Link
                            </a>
                        </Button>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-sm text-muted-foreground pt-4">This group has no members to share with.</p>
                )}
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
