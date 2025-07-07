
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Person, CallStatus } from "@/lib/types";
import { callStatuses } from "@/lib/data";
import { Phone, SkipForward, Square, CheckSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const callFormSchema = z.object({
  remark: z.string().trim().optional(),
  status: z.string().min(1, { message: "Please select a call status." }),
});

type CallFormValues = z.infer<typeof callFormSchema>;

type CallingSessionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaveRemark: (personId: string, remark: string, duration: string, status: CallStatus) => void;
  people: Person[];
  currentEvent: string;
};

export function CallingSessionDialog({
  isOpen,
  onClose,
  onSaveRemark,
  people,
  currentEvent
}: CallingSessionDialogProps) {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [callStartTime, setCallStartTime] = React.useState<Date | null>(null);
  const currentPerson = people[currentIndex];

  const form = useForm<CallFormValues>({
    resolver: zodResolver(callFormSchema),
    defaultValues: {
      remark: "",
      status: "",
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
        setCurrentIndex(0);
        form.reset({ remark: "", status: "" });
    }
  }, [isOpen, form]);

  React.useEffect(() => {
    if (currentPerson) {
        form.reset({ remark: currentPerson.lastCallRemark || "", status: currentPerson.lastCallStatus || "" });
        setCallStartTime(new Date());
    }
  }, [currentPerson, form]);
  
  const goToNext = () => {
    if (currentIndex < people.length - 1) {
        setCurrentIndex(currentIndex + 1);
    } else {
        toast({
            title: "Calling Session Complete!",
            description: "You have gone through all the contacts in this list.",
        });
        onClose();
    }
  }

  const handleSkip = () => {
    goToNext();
  };
  
  const onSubmit = (data: CallFormValues) => {
    if (!currentPerson || !callStartTime) return;
    
    const callEndTime = new Date();
    const durationInSeconds = Math.round((callEndTime.getTime() - callStartTime.getTime()) / 1000);
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    const durationString = `${minutes}m ${seconds}s`;

    onSaveRemark(currentPerson.id, data.remark || '', durationString, data.status as CallStatus);
    toast({
        title: "Call Logged",
        description: `Status for ${currentPerson.firstName} has been updated.`
    });
    goToNext();
  };

  const handleCloseDialog = () => {
    onClose();
  }

  if (!isOpen || !currentPerson) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            Calling: {currentPerson.firstName} {currentPerson.lastName}
          </DialogTitle>
          <DialogDescription>
            Contact {currentIndex + 1} of {people.length} for: <span className="font-semibold text-primary">{currentEvent}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    <span className="text-lg font-semibold text-primary">{currentPerson.phone}</span>
                </div>
                 <Button asChild variant="outline">
                    <a href={`tel:${currentPerson.phone}`}>Call Now</a>
                </Button>
            </div>
            
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} id="call-form" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call Status</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a call status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                               {callStatuses.map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                               ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                    control={form.control}
                    name="remark"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Call Remarks (Optional)</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="e.g., Discussed about the upcoming event, interested to join."
                                className="resize-y min-h-[100px]"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </form>
            </Form>
        </div>

        <DialogFooter className="grid grid-cols-3 gap-2">
            <Button variant="secondary" onClick={onClose} className="col-span-1">
                <Square className="mr-2 h-4 w-4"/>
                End Session
            </Button>
             <Button variant="outline" onClick={handleSkip} className="col-span-1">
                <SkipForward className="mr-2 h-4 w-4"/>
                Skip
            </Button>
            <Button type="submit" form="call-form" className="col-span-1" disabled={form.formState.isSubmitting}>
                <CheckSquare className="mr-2 h-4 w-4"/>
                Save & Next
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
