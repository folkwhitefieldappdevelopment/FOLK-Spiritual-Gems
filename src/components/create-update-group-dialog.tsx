"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Group, UserRole, AppUser } from "@/lib/types";
import { userRoles } from "@/lib/types";
import { Camera, Upload, SwitchCamera, Loader2, User, Users, UserPlus, X, BellRing, Sparkles, Clock, Mail } from "lucide-react";

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
  name: z.string().min(2, {
    message: "Group name must be at least 2 characters.",
  }),
  description: z.string().max(160, {
    message: "Description must not be longer than 160 characters.",
  }).optional(),
  visibility: z.array(z.string()).default([]),
  assignedToId: z.string().optional(),
  reportingEnabled: z.boolean().default(false),
  reportTime: z.string().optional(),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context not available')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
    reader.onerror = reject;
  });
};

type CreateUpdateGroupDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (data: any) => void;
  group?: Group;
};

export function CreateUpdateGroupDialog({
  isOpen,
  setIsOpen,
  onSave,
  group,
}: CreateUpdateGroupDialogProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const isPrivileged = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');

  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = React.useState(false);
  const [cameraMode, setCameraMode] = React.useState<'user' | 'environment'>('user');
  const [assignableUsers, setAssignableUsers] = React.useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      visibility: [],
      assignedToId: "",
      reportingEnabled: false,
      reportTime: "20:00",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (group) {
        form.reset({
          name: group.name,
          description: group.description,
          visibility: group.visibility || [],
          assignedToId: group.sharedWithUserIds?.[0] || "",
          reportingEnabled: group.reportingEnabled || false,
          reportTime: group.reportTime || "20:00",
        });
        setPhotoPreview(group.photoUrl || null);
      } else {
        form.reset({
          name: "",
          description: "",
          visibility: [],
          assignedToId: "",
          reportingEnabled: false,
          reportTime: "20:00",
        });
        setPhotoPreview(null);
      }
      setShowCamera(false);

      if (isPrivileged && appUser) {
        setIsLoadingUsers(true);
        getAssignableUsersForAssignments(appUser)
          .then(setAssignableUsers)
          .finally(() => setIsLoadingUsers(false));
      }
    }
  }, [group, form, isOpen, isPrivileged, appUser]);

  useEffect(() => {
    if (!showCamera) return;
    let activeStream: MediaStream | null = null;
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraMode } });
        activeStream = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        toast({ variant: 'destructive', title: 'Camera Error' });
        setShowCamera(false);
      }
    };
    startCam();
    return () => activeStream?.getTracks().forEach(t => t.stop());
  }, [showCamera, cameraMode, toast]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessingPhoto(true);
      try {
        const compressed = await compressImage(file);
        setPhotoPreview(compressed);
      } catch (e) {
        toast({ variant: 'destructive', title: 'Upload failed' });
      } finally {
        setIsProcessingPhoto(false);
        if (event.target) event.target.value = '';
      }
    }
  };

  const handleCapture = async () => {
    if (videoRef.current) {
      setIsProcessingPhoto(true);
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            const compressed = await compressImage(new File([blob], "group.jpg", { type: "image/jpeg" }));
            setPhotoPreview(compressed);
            setShowCamera(false);
          } catch (e) { toast({ variant: 'destructive', title: 'Capture failed' }); }
          finally { setIsProcessingPhoto(false); }
        }
      }, 'image/jpeg', 0.7);
    }
  };

  const onSubmit = (data: GroupFormValues) => {
    const isActuallyAssigned = data.assignedToId && data.assignedToId !== 'UNASSIGNED';
    const selectedAssignee = assignableUsers.find(u => u.id === data.assignedToId);
    
    const saveData: any = {
        name: data.name,
        description: data.description || '',
        visibility: data.visibility as UserRole[],
        photoUrl: photoPreview || '',
        sharedWithUserIds: isActuallyAssigned ? [data.assignedToId!] : [],
        assignedToName: isActuallyAssigned ? (selectedAssignee?.name || '') : null,
        reportingEnabled: data.reportingEnabled,
        reportTime: data.reportTime,
        reportRecipients: [appUser?.id].filter(Boolean),
    };

    if (!group) {
        saveData.createdBy = appUser?.id;
        saveData.createdByName = appUser?.name;
    }
    
    onSave(saveData);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl bg-[#1e1e2e] border-none rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-white/5 bg-[#1b1d32]">
          <DialogTitle className="text-2xl font-black text-white">{group ? "Group Settings 📂" : "New Group 👥"}</DialogTitle>
          <DialogDescription className="text-slate-400 font-bold">
            Configure metadata and automated reporting pulse.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-8 space-y-8">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <Avatar className="h-32 w-48 rounded-3xl border-4 border-primary/20 bg-[#161623] shadow-2xl">
                  <AvatarImage src={photoPreview || ''} className="object-cover" />
                  <AvatarFallback className="rounded-3xl">
                    <Users className="h-12 w-12 text-slate-500 opacity-30" />
                  </AvatarFallback>
                </Avatar>
                {isProcessingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl bg-white/5 border-white/5 font-bold h-10 px-4 text-white hover:bg-white/10" onClick={() => fileInputRef.current?.click()} disabled={isProcessingPhoto}>
                    <Upload className="mr-2 h-4 w-4" /> Gallery
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl bg-white/5 border-white/5 font-bold h-10 px-4 text-white hover:bg-white/10" onClick={() => setShowCamera(true)} disabled={isProcessingPhoto}>
                    <Camera className="mr-2 h-4 w-4" /> Camera
                  </Button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              
              {showCamera && (
                <div className="w-full space-y-4 animate-in fade-in zoom-in-95">
                  <div className="relative">
                    <video ref={videoRef} className="w-full aspect-video rounded-3xl bg-black object-cover shadow-2xl border-2 border-white/5" autoPlay muted playsInline />
                    <Button variant="ghost" size="icon" onClick={() => setShowCamera(false)} className="absolute top-4 right-4 rounded-full bg-black/50 text-white"><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex justify-center gap-3">
                    <Button type="button" variant="outline" className="rounded-xl font-bold border-white/10 text-white" onClick={() => setCameraMode(p => p === 'user' ? 'environment' : 'user')}>
                      <SwitchCamera className="h-4 w-4 mr-2" /> Switch
                    </Button>
                    <Button size="lg" className="rounded-xl font-black bg-[#FF9800] text-black px-10" onClick={handleCapture} disabled={isProcessingPhoto}>Capture Photo</Button>
                  </div>
                </div>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. ITPL Outreach Batch" {...field} className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold px-5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Context / Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief context about this list..."
                            className="resize-none rounded-xl border-white/5 bg-[#161623] text-white font-bold p-5 min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {isPrivileged && (
                  <div className="space-y-8 pt-8 border-t border-white/5">
                    <div className="space-y-6">
                        <FormField
                        control={form.control}
                        name="reportingEnabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-[1.5rem] border border-white/5 bg-[#161623] p-6 shadow-inner">
                            <div className="space-y-1">
                                <FormLabel className="text-base font-black text-white flex items-center gap-2 uppercase tracking-tight">
                                    <Mail className="h-4 w-4 text-[#FF9800]" />
                                    Daily Email Pulse
                                </FormLabel>
                                <FormDescription className="text-[10px] font-bold text-slate-500 leading-tight">
                                Receive an automated healthy summary at a specific time every day.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            </FormItem>
                        )}
                        />

                        {form.watch('reportingEnabled') && (
                            <FormField
                            control={form.control}
                            name="reportTime"
                            render={({ field }) => (
                                <FormItem className="space-y-2 px-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-primary" />
                                        <FormLabel className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Delivery Schedule (24h)</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Input type="time" {...field} className="h-10 w-32 rounded-lg border-white/5 bg-[#161623] text-white font-bold text-center" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                        )}
                    </div>

                    <FormField
                      control={form.control}
                      name="assignedToId"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <div className="flex items-center gap-2 mb-1">
                            <UserPlus className="h-4 w-4 text-primary" />
                            <FormLabel className="text-[10px] font-black uppercase text-primary tracking-widest">Assign to Enabler</FormLabel>
                          </div>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-14 rounded-xl border-white/5 bg-[#161623] text-white font-bold px-5">
                                <SelectValue placeholder="Select Assignee..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#1e1e2e] border-white/5 text-white">
                              <SelectItem value="UNASSIGNED" className="font-bold text-red-500">Unassigned (None)</SelectItem>
                              {assignableUsers.map(u => (
                                <SelectItem key={u.id} value={u.id} className="font-bold">{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="visibility"
                      render={() => (
                        <FormItem className="space-y-4">
                          <FormLabel className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Team Visibility</FormLabel>
                          <div className="grid grid-cols-1 gap-3 bg-[#161623] p-6 rounded-3xl border border-white/5">
                            {userRoles.map((role) => (
                              <FormField
                                key={role}
                                control={form.control}
                                name="visibility"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={role}
                                      className="flex flex-row items-center space-x-4 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(role)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, role])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== role
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-bold text-slate-300 cursor-pointer">
                                        All {role}s
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </form>
            </Form>
          </div>
        </ScrollArea>
        
        <DialogFooter className="p-8 border-t border-white/5 bg-[#1b1d32] gap-4">
            <Button variant="ghost" type="button" onClick={() => setIsOpen(false)} className="rounded-xl font-bold text-slate-400 hover:text-white">Cancel</Button>
            <Button type="submit" className="rounded-xl font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 px-10 h-14 shadow-xl shadow-primary/20" onClick={form.handleSubmit(onSubmit)} disabled={isProcessingPhoto}>
                {group ? "Update Group" : "Initialize Group"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
