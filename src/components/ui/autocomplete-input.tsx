'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

/**
 * A custom Autocomplete input component that provides suggestions as the user types.
 * Designed to avoid external dependencies like 'cmdk' while maintaining standard ShadCN styling.
 */
export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder = "Search or type...",
  className,
}: AutocompleteInputProps) {
  const [open, setOpen] = React.useState(false);

  const filteredSuggestions = React.useMemo(() => {
    if (!value) return suggestions;
    const lowerValue = value.toLowerCase();
    return suggestions.filter((s) =>
      s.toLowerCase().includes(lowerValue)
    );
  }, [value, suggestions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={cn(
                "h-12 rounded-xl bg-muted border-border font-bold px-4 w-full pr-10",
                className
              )}
              onFocus={() => setOpen(true)}
              // A small delay on blur allows the onMouseDown on suggestions to execute first
              onBlur={() => setTimeout(() => setOpen(false), 200)}
            />
            <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
        </div>
      </PopoverTrigger>
      {open && (
        <PopoverContent 
          className="w-[--radix-popover-trigger-width] p-0 border border-border rounded-2xl shadow-2xl overflow-hidden bg-popover" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollArea className="max-h-[200px]">
            {filteredSuggestions.length === 0 ? (
                <div className="p-4 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center opacity-40 italic">
                    No matching suggestions
                </div>
            ) : (
                <div className="p-1">
                    {filteredSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={cn(
                            "relative flex w-full cursor-default select-none items-center rounded-xl py-3 px-4 text-xs font-bold outline-none transition-colors hover:bg-primary/10 hover:text-primary text-left",
                            value === suggestion && "bg-primary/5 text-primary"
                          )}
                          onMouseDown={(e) => {
                            // Using onMouseDown + preventDefault to capture the selection before the input blurs
                            e.preventDefault();
                            onChange(suggestion);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === suggestion ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {suggestion}
                        </button>
                    ))}
                </div>
            )}
          </ScrollArea>
        </PopoverContent>
      )}
    </Popover>
  );
}
