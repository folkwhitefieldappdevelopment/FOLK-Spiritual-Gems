
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Group, UserRole } from "@/lib/types";
import { userRoles } from "@/lib/types";

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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";

const groupFormSchema = z.object({
  name: z.string().min(2, {
    message: "Group name must be at least 2 characters.",
  }),
  description: z.string().max(160, {
    message: "Description must not be longer than 160 characters.",
  }).optional(),
  visibility: z.array(z.string()).default([]),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

type CreateUpdateGroupDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (data: Omit<Group, "id" | "memberCount" | "peopleIds" | "createdBy" | "creatorRole">) => void;
  group?: Group;
};

export function CreateUpdateGroupDialog({
  isOpen,
  setIsOpen,
  onSave,
  group,
}: CreateUpdateGroupDialogProps) {
  const { appUser } = useAuth();

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      visibility: [],
    },
  });

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
        description: group.description,
        visibility: group.visibility || [],
      });
    } else {
        form.reset({
            name: "",
            description: "",
            visibility: [],
        });
    }
  }, [group, form]);

  const onSubmit = (data: GroupFormValues) => {
    onSave({
        name: data.name,
        description: data.description || '',
        visibility: data.visibility as UserRole[],
    });
    setIsOpen(false);
  };
  
  const canSetVisibility = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  
  const availableRolesToShare: UserRole[] = useMemo(() => {
    if (appUser?.role.includes('Admin')) {
      return ['Folk Guide', 'Folk Enabler'];
    }
    if (appUser?.role.includes('Folk Guide')) {
      return ['Folk Enabler'];
    }
    return [];
  }, [appUser]);

  const selectedVisibilityRoles = form.watch('visibility');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{group ? "Edit Group" : "Create Group"}</DialogTitle>
          <DialogDescription>
            {group
              ? "Update the details of your group."
              : "Create a new group to organize people."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Marketing Team" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A short description of the group"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {canSetVisibility && (
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Share With</FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <div className="truncate">
                              {selectedVisibilityRoles.length > 0
                                ? `Shared with: ${selectedVisibilityRoles.join(', ')}`
                                : 'Private (only me)'}
                            </div>
                          </Button>
                        </FormControl>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                        {availableRolesToShare.map(role => (
                          <DropdownMenuCheckboxItem
                            key={role}
                            checked={field.value.includes(role)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, role])
                                : field.onChange(field.value.filter(value => value !== role));
                            }}
                          >
                            {role}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <FormDescription>Select which roles can view this group.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
