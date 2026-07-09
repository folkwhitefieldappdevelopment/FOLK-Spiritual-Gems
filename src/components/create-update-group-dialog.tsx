"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Group, UserRole, AppUser } from "@/lib/types";
import { userRoles } from "@/lib/types";
import { Camera, Upload, SwitchCamera, Loader2, Users, UserPlus, X, Clock, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";
import { Checkbox } from "./ui/checkbox";
import { Switch } from "./ui/switch";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";
import { getAssignableUsersForAssignments } from "@/services/user-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const groupFormSchema = z.object({
  name: z.string().min(2, { message: "Group name must be at least 2 characters." }),
  description: z.string().max(160, { message: "Description must not be longer than 160 characters." }).optional(),
  visibility: z.array(z.string()).default([]),
  assignedToId: z.string().optional(),
  reportingEnabled: z.boolean().default(false),
  reportTime: z.string().optional(),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

type CreateUpdateGroupDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (data: any) => void;
  group?: Group;
};

export function CreateUpdateGroupDialog({ isOpen, setIsOpen, onSave, group }: CreateUpdateGroupDialogProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const isPrivileged = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = React.useState(false);
  const [cameraMode, setCameraMode] = React.useState<'user' | 'environment'>('user');
  const [assignableUsers, setAssignableUsers] = React.useState<AppUser[]>([]);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: "", description: "", visibility: [], assignedToId: "", reportingEnabled: false, reportTime: "20:00" },
  });

  useEffect(() => {
    if (isOpen) {
      if (group) {
        form.reset({ name: group.name, description: group.description, visibility: group.visibility || [], assignedToId: group.sharedWithUserIds?.[0] || "", reportingEnabled: group.reportingEnabled || false, reportTime: group.reportTime || "20:00" });
        setPhotoPreview(group.photoUrl || null);
      } else {
        form.reset({ name: "", description: "", visibility: [], assignedToId: "", reportingEnabled: false, reportTime: "20:00" });
        setPhotoPreview(null);
      }
      if (isPrivileged && appUser) getAssignableUsersForAssignments(appUser).then(setAssignableUsers);
    }
  }, [group, form, isOpen, isPrivileged, appUser]);

  const handleCapture = async () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setPhotoPreview(canvas.toDataURL('image/jpeg', 0.7));
      setShowCamera(false);
    }
  };

  const onSubmit = (data: GroupFormValues) => {
    const selectedAssignee = assignableUsers.find(u => u.id === data.assignedToId);
    onSave({ ...data, photoUrl: photoPreview || '', sharedWithUserIds: data.assignedToId ? [data.assignedToId] : [], assignedToName: selectedAssignee?.name || null });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl bg-popover border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-border bg-card">
          <DialogTitle className="text-2xl font-black text-foreground">{group ? "Group Settings 📂" : "New Group 👥"}</DialogTitle>
          <DialogDescription className="text-muted-foreground font-bold">Configure metadata and automated reporting pulse.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-8 space-y-8">
            <div className="flex flex-col items-center gap-6">
              <Avatar className="h-32 w-48 rounded-3xl border-4 border-primary/20 bg-muted shadow-2xl"><AvatarImage src={photoPreview || ''} className="object-cover" /><AvatarFallback className="rounded-3xl"><Users className="h-12 w-12 text-muted-foreground opacity-30" /></AvatarFallback></Avatar>
              <div className="flex gap-3"><Button type="button" variant="outline" size="sm" className="rounded-xl bg-muted/50 border-border font-bold h-10 px-4 text-foreground hover:bg-muted" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Gallery</Button><Button type="button" variant="outline" size="sm" className="rounded-xl bg-muted/50 border-border font-bold h-10 px-4 text-foreground hover:bg-muted" onClick={() => setShowCamera(true)}><Camera className="mr-2 h-4 w-4" /> Camera</Button></div>
              <input type="file" ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onload=ev=>setPhotoPreview(ev.target?.result as string); r.readAsDataURL(f); } }} className="hidden" accept="image/*" />
            </div>
            <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Group Name</FormLabel><FormControl><Input placeholder="e.g. ITPL Batch" {...field} className="h-14 rounded-xl border-border bg-muted text-foreground font-bold px-5" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Context</FormLabel><FormControl><Textarea placeholder="Brief context..." className="rounded-xl border-border bg-muted text-foreground font-bold p-5 min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>)} />
              {isPrivileged && <div className="space-y-8 pt-8 border-t border-border">
                <FormField control={form.control} name="reportingEnabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-[1.5rem] border border-border bg-muted p-6 shadow-inner"><div className="space-y-1"><FormLabel className="text-base font-black text-foreground flex items-center gap-2 uppercase tracking-tight"><Mail className="h-4 w-4 text-[#FF9800]" /> Daily Email Pulse</FormLabel><FormDescription className="text-[10px] font-bold text-muted-foreground leading-tight">Receive automated summary.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="assignedToId" render={({ field }) => (<FormItem><div className="flex items-center gap-2 mb-1"><UserPlus className="h-4 w-4 text-primary" /><FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Assign to Enabler</FormLabel></div><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-14 rounded-xl border-border bg-muted text-foreground font-bold px-5"><SelectValue placeholder="Select Assignee..." /></SelectTrigger></FormControl><SelectContent className="bg-popover border-border text-foreground">{assignableUsers.map(u => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent></Select></FormItem>)} />
              </div>}
            </form></Form>
          </div>
        </ScrollArea>
        <DialogFooter className="p-8 border-t border-border bg-card gap-4"><Button variant="ghost" type="button" onClick={() => setIsOpen(false)} className="rounded-xl font-bold text-muted-foreground hover:text-foreground">Cancel</Button><Button type="submit" className="rounded-xl font-black uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 px-10 h-14 shadow-xl shadow-primary/20" onClick={form.handleSubmit(onSubmit)}>Save Group</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
