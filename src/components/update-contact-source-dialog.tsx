'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getContactSources } from '@/services/settings-service';
import { Tag, Loader2 } from 'lucide-react';

type UpdateContactSourceDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (sources: string[]) => Promise<void>;
  peopleCount: number;
};

export function UpdateContactSourceDialog({
  isOpen,
  setIsOpen,
  onSave,
  peopleCount,
}: UpdateContactSourceDialogProps) {
  const [availableSources, setAvailableSources] = React.useState<string[]>([]);
  const [selectedSources, setSelectedSources] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getContactSources().then(sources => {
        setAvailableSources(sources);
        setIsLoading(false);
      });
      setSelectedSources([]);
    }
  }, [isOpen]);

  const handleToggleSource = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSave(selectedSources);
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Update Contact Source
          </DialogTitle>
          <DialogDescription>
            Overwrite the source for {peopleCount} selected contacts.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-64 border rounded-md p-4">
              <div className="space-y-3">
                {availableSources.map(source => (
                  <div key={source} className="flex items-center space-x-3">
                    <Checkbox 
                      id={`source-${source}`} 
                      checked={selectedSources.includes(source)}
                      onCheckedChange={() => handleToggleSource(source)}
                    />
                    <Label htmlFor={`source-${source}`} className="text-sm font-medium leading-none cursor-pointer">
                      {source}
                    </Label>
                  </div>
                ))}
                {availableSources.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center pt-8 italic">No contact sources defined in settings.</p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting || selectedSources.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Sources
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
