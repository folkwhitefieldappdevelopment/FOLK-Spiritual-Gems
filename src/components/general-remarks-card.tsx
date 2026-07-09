
'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updatePerson } from '@/services/people-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type GeneralRemarksCardProps = {
  personId: string;
  initialRemarks: string;
  personName: string;
};

export function GeneralRemarksCard({ personId, initialRemarks, personName }: GeneralRemarksCardProps) {
  const { toast } = useToast();
  const [remarks, setRemarks] = React.useState(initialRemarks);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);

  React.useEffect(() => {
    setRemarks(initialRemarks);
    setIsDirty(false); // Reset dirty state when initial remarks change
  }, [initialRemarks]);

  const handleRemarksChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRemarks(e.target.value);
    if (!isDirty) {
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePerson(personId, { generalRemarks: remarks });
      toast({ title: 'Remarks Saved', description: `Progress notes for ${personName} have been updated.` });
      setIsDirty(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save remarks.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Notes</CardTitle>
        <CardDescription>
          A general log for tracking progress and important notes about {personName}. This is separate from individual call logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="general-remarks">Remarks</Label>
          <Textarea
            id="general-remarks"
            placeholder="Log progress, important updates, or any general notes here..."
            value={remarks}
            onChange={handleRemarksChange}
            className="min-h-[300px]"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || !isDirty}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Notes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
