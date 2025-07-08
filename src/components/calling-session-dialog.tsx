
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
  sg: z.string().optional(),
  ma: z.string().optional(),
  frp: z.string().optional(),
});

type CallFormValues = z.infer<typeof callFormSchema>;

type CallingSessionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaveRemark: (
    personId: string, 
    remark: string, 
    status: CallStatus,
    sg: boolean | undefined,
    ma: boolean | undefined,
    frp: boolean | undefined
  ) => void;
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
  const currentPerson = people[currentIndex];

  const form = useForm<CallFormValues>({
    resolver: zodResolver(callFormSchema),
    defaultValues: {
      remark: "",
      status: "",
      sg: "",
      ma: "",
      frp: "",
    },
  });
  
  React.useEffect(() => {
    if (isOpen) {
        setCurrentIndex(0);
        form.reset({ remark: "", status: "", sg: "", ma: "", frp: "" });
    }
  }, [isOpen, form]);

  React.useEffect(() => {
    if (currentPerson) {
        // Reset with last status, but clear the remark for a new entry.
        form.reset({ 
            remark: "", 
            status: currentPerson.lastCallStatus || "",
            sg: typeof currentPerson.lastSg === 'boolean' ? (currentPerson.lastSg ? 'yes' : 'no') : '',
            ma: typeof currentPerson.lastMa === 'boolean' ? (currentPerson.lastMa ? 'yes' : 'no') : '',
            frp: typeof currentPerson.lastFrp === 'boolean' ? (currentPerson.lastFrp ? 'yes' : 'no') : '',
        });
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
    if (!currentPerson) return;
    
    const sg = data.sg === 'yes' ? true : data.sg === 'no' ? false : undefined;
    const ma = data.ma === 'yes' ? true : data.ma === 'no' ? false : undefined;
    const frp = data.frp === 'yes' ? true : data.frp === 'no' ? false : undefined;
    const fullName = `${currentPerson.firstName || ''} ${currentPerson.lastName || ''}`.trim();

    onSaveRemark(currentPerson.id, data.remark || '', data.status as CallStatus, sg, ma, frp);
    toast({
        title: "Call Logged",
        description: `Status for ${fullName} has been updated.`
    });
    goToNext();
  };

  const handleCloseDialog = () => {
    onClose();
  }

  if (!isOpen || !currentPerson) {
    return null;
  }
  
  const fullName = `${currentPerson.firstName || ''} ${currentPerson.lastName || ''}`.trim();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            Calling: {fullName}
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
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline">
                    <a href={`tel:${currentPerson.phone}`}>Call Now</a>
                  </Button>
                  <Button asChild variant="outline" size="icon" aria-label="Open WhatsApp chat">
                    <a href={`https://wa.me/91${currentPerson.phone.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <svg
                            role="img"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 fill-current text-green-600"
                        >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.86 11.86 0 005.794 1.504h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        <span className="sr-only">Open WhatsApp chat</span>
                    </a>
                  </Button>
                </div>
            </div>
            
            {currentPerson.lastCallRemark && (
              <div className="text-sm p-3 bg-muted/50 rounded-lg max-h-24 overflow-y-auto">
                <p className="font-semibold text-muted-foreground mb-1">Previous Remark:</p>
                <p className="text-foreground whitespace-pre-wrap">{currentPerson.lastCallRemark}</p>
              </div>
            )}

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
                     <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="sg"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>SG</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="yes">Yes</SelectItem>
                                            <SelectItem value="no">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="ma"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>MA</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="yes">Yes</SelectItem>
                                            <SelectItem value="no">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="frp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>FRP</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="yes">Yes</SelectItem>
                                            <SelectItem value="no">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                    control={form.control}
                    name="remark"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>New Remark (Optional)</FormLabel>
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
