'use client';

import * as React from 'react';
import { 
    SlidersHorizontal, 
    X, 
    Search, 
    History, 
    User, 
    Calendar, 
    Tag, 
    UserCheck,
    ChevronDown,
    LayoutList,
    Sparkles
} from 'lucide-react';
import type { FilterState, FolkStage, CallStatus } from '@/lib/types';
import { folkStages, callStatuses } from '@/lib/types';
import type { EnablerOption } from '@/services/settings-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useDebounce } from 'use-debounce';

type ContactFilterPanelProps = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  enablerOptions: EnablerOption[];
  sourceOptions: string[];
  stayingWithOptions: string[];
};

export function ContactFilterPanel({
  filters,
  onChange,
  onApply,
  onReset,
  enablerOptions,
  sourceOptions,
  stayingWithOptions,
}: ContactFilterPanelProps) {
  const [debouncedFilters] = useDebounce(filters, 400);

  // Auto-apply on filter change
  React.useEffect(() => {
    onApply();
  }, [debouncedFilters, onApply]);

  const activeCount = React.useMemo(() => {
    let count = 0;
    if (filters.name || filters.phone) count++;
    if (filters.location) count++;
    if (filters.stage) count++;
    if (filters.enablerId) count++;
    if (filters.callStatus) count++;
    if (filters.stayingWith) count++;
    if (filters.chantingRounds || filters.chantingRoundsMin) count++;
    if (filters.contactSources.length > 0) count++;
    if (filters.eventName || filters.callerName || filters.callDateFrom || filters.callDateTo) count++;
    return count;
  }, [filters]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  const removeFilter = (key: keyof FilterState) => {
    if (key === 'contactSources') updateFilter(key, []);
    else updateFilter(key, '');
  };

  return (
    <div className="bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden mb-8">
        <div className="p-6 sm:p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                        <SlidersHorizontal className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-black text-xs uppercase tracking-[0.2em] text-[#FF9800]">ADVANCED FILTERS</span>
                    {activeCount > 0 && (
                        <Badge variant="secondary" className="bg-primary text-primary-foreground font-black text-[10px] rounded-full h-6 px-3">
                            {activeCount} Active
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={onReset} className="h-9 px-4 font-black text-muted-foreground uppercase text-[10px] tracking-widest hover:bg-muted/50 rounded-xl">Clear All</Button>
                    <Button onClick={onApply} className="h-9 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg">Apply Now</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6">
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">STAGING</Label>
                    <Select value={filters.stage} onValueChange={v => updateFilter('stage', v)}>
                        <SelectTrigger className="h-11 bg-muted border-none rounded-xl text-foreground font-bold px-4">
                            <SelectValue placeholder="All Stages" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            <SelectItem value="__ALL__" className="font-bold">All Stages</SelectItem>
                            {folkStages.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2"><UserCheck className="h-3 w-3" /> ASSIGNED TO</Label>
                    <Select value={filters.enablerId} onValueChange={v => updateFilter('enablerId', v)}>
                        <SelectTrigger className="h-11 bg-muted border-none rounded-xl text-foreground font-bold px-4">
                            <SelectValue placeholder="All Enablers" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            {enablerOptions.map(o => <SelectItem key={o.value} value={o.value} className="font-bold">{o.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">LOCATION</Label>
                    <Input placeholder="Search area..." value={filters.location} onChange={e => updateFilter('location', e.target.value)} className="h-11 bg-muted border-none rounded-xl text-foreground font-bold px-4" />
                </div>

                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">CHANTING PROGRESS</Label>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Select 
                                value={filters.chantingRoundsMin ? '16' : filters.chantingRounds} 
                                onValueChange={v => {
                                    if (v === '16+') {
                                        onChange({ ...filters, chantingRoundsMin: '16', chantingRounds: '' });
                                    } else {
                                        onChange({ ...filters, chantingRoundsMin: '', chantingRounds: v });
                                    }
                                }}
                            >
                                <SelectTrigger className="h-11 bg-muted border-none rounded-xl text-foreground font-bold px-4">
                                    <SelectValue placeholder="Rounds..." />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border">
                                    <SelectItem value="__ALL__" className="font-bold">Any Rounds</SelectItem>
                                    <SelectItem value="16+" className="font-black text-primary">16+ (Minimum)</SelectItem>
                                    {Array.from({length: 17}, (_, i) => i.toString()).map(r => <SelectItem key={r} value={r} className="font-bold">{r} Rounds</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1">CALL OUTCOME</Label>
                    <Select value={filters.callStatus} onValueChange={v => updateFilter('callStatus', v)}>
                        <SelectTrigger className="h-11 bg-muted border-none rounded-xl text-foreground font-bold px-4">
                            <SelectValue placeholder="Any Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                            <SelectItem value="__ALL__" className="font-bold">Any Status</SelectItem>
                            {callStatuses.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2"><Tag className="h-3 w-3" /> SOURCE</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full h-11 bg-muted border-none rounded-xl text-foreground font-bold px-4 justify-between">
                                <span className="truncate">{filters.contactSources.length > 0 ? `${filters.contactSources.length} selected` : 'Any Sources'}</span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="bg-popover border-border p-2 w-[240px] rounded-2xl shadow-2xl">
                            <ScrollArea className="h-[200px]">
                                <div className="space-y-1">
                                    {sourceOptions.map(o => (
                                        <div key={o} className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg cursor-pointer" onClick={() => {
                                            const next = filters.contactSources.includes(o) ? filters.contactSources.filter(s => s !== o) : [...filters.contactSources, o];
                                            updateFilter('contactSources', next);
                                        }}>
                                            <Checkbox checked={filters.contactSources.includes(o)} onCheckedChange={() => {}} />
                                            <span className="text-xs font-bold">{o}</span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2"><History className="h-3 w-3" /> EVENT NAME</Label>
                    <Input placeholder="e.g. Sunday Feast..." value={filters.eventName} onChange={e => updateFilter('eventName', e.target.value)} className="h-11 bg-muted border-none rounded-xl text-foreground font-bold px-4" />
                </div>

                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest ml-1 flex items-center gap-2"><Calendar className="h-3 w-3" /> LAST CALLED (FROM)</Label>
                    <Input type="date" value={filters.callDateFrom} onChange={e => updateFilter('callDateFrom', e.target.value)} className="h-11 bg-muted border-none rounded-xl text-foreground font-bold px-4" />
                </div>
            </div>

            {activeCount > 0 && (
                <div className="pt-4 border-t border-border flex flex-wrap gap-2">
                    {filters.stage && filters.stage !== '__ALL__' && (
                        <Badge variant="outline" className="h-8 gap-2 bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest pl-3 pr-1.5 rounded-lg">
                            Stage: {filters.stage}
                            <button onClick={() => removeFilter('stage')} className="hover:bg-primary/20 rounded-md p-1"><X className="h-3 w-3" /></button>
                        </Badge>
                    )}
                    {filters.enablerId && filters.enablerId !== '__UNASSIGNED__' && (
                        <Badge variant="outline" className="h-8 gap-2 bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest pl-3 pr-1.5 rounded-lg">
                            Enabler: {filters.enablerId.split('::')[0]}
                            <button onClick={() => removeFilter('enablerId')} className="hover:bg-primary/20 rounded-md p-1"><X className="h-3 w-3" /></button>
                        </Badge>
                    )}
                    {filters.location && (
                        <Badge variant="outline" className="h-8 gap-2 bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest pl-3 pr-1.5 rounded-lg">
                            Area: {filters.location}
                            <button onClick={() => removeFilter('location')} className="hover:bg-primary/20 rounded-md p-1"><X className="h-3 w-3" /></button>
                        </Badge>
                    )}
                    {filters.callStatus && filters.callStatus !== '__ALL__' && (
                        <Badge variant="outline" className="h-8 gap-2 bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest pl-3 pr-1.5 rounded-lg">
                            Status: {filters.callStatus}
                            <button onClick={() => removeFilter('callStatus')} className="hover:bg-primary/20 rounded-md p-1"><X className="h-3 w-3" /></button>
                        </Badge>
                    )}
                    {filters.chantingRoundsMin && (
                        <Badge variant="outline" className="h-8 gap-2 bg-orange-500/5 text-orange-600 border-orange-500/20 font-black text-[9px] uppercase tracking-widest pl-3 pr-1.5 rounded-lg">
                            Chanting: 16+
                            <button onClick={() => updateFilter('chantingRoundsMin', '')} className="hover:bg-orange-500/20 rounded-md p-1"><X className="h-3 w-3" /></button>
                        </Badge>
                    )}
                    {filters.chantingRounds && filters.chantingRounds !== '__ALL__' && (
                        <Badge variant="outline" className="h-8 gap-2 bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest pl-3 pr-1.5 rounded-lg">
                            Chanting: {filters.chantingRounds}R
                            <button onClick={() => removeFilter('chantingRounds')} className="hover:bg-primary/20 rounded-md p-1"><X className="h-3 w-3" /></button>
                        </Badge>
                    )}
                </div>
            )}
        </div>
    </div>
  );
}
