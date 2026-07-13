'use client';

import * as React from 'react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import {
  MoreHorizontal,
  ChevronDown,
  Anchor,
  BadgeCheck,
  Clock,
  History,
  RotateCcw,
  PhoneCall,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { CallLog } from '@/lib/call-log';
import { useToast } from '@/hooks/use-toast';
import type { Person, Group } from '@/lib/types';
import { TableCell, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from './ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { safeDate } from '@/utils/date';
import { FolkStageDisplay } from './editable-person-details-form';
import { ScrollArea } from './ui/scroll-area';

type PersonTableRowProps = {
  person: Person;
  index?: number;
  onEdit: (person: Person) => void;
  onDelete: (personId: string) => void;
  onStartCall: (person: Person) => void;
  onRestore?: (personId: string) => void;
  isSelected: boolean;
  onSelect?: (checked: boolean) => void;
  allGroups?: Group[];
  visibleColumns: Record<string, boolean>;
  showEnablerColumn?: boolean;
  navigationContext?: { groupId?: string; scope?: string };
};

const PersonTableRowComponent = ({
  person,
  index,
  onEdit,
  onDelete,
  onStartCall,
  onRestore,
  isSelected,
  onSelect,
  visibleColumns,
  navigationContext,
}: PersonTableRowProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();

  const fullName = person.fullName || '';
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const lastCallDate = safeDate(person.lastCallAt);
  const registeredDate = safeDate(person.createdAt);

  const unifiedHistory = React.useMemo(() => {
    const history = (person.callHistory || []);
    const attendances = (person.attendanceHistory || []).map(a => ({
        calledAt: a.timestamp,
        status: 'Attended',
        event: a.eventName || a.groupName,
        remark: `Form marked in ${a.groupName}`,
        callerName: 'System',
        type: 'attendance'
    }));

    return [...history, ...attendances].sort((a, b) => {
        const da = safeDate(a.calledAt)?.getTime() || 0;
        const db = safeDate(b.calledAt)?.getTime() || 0;
        return db - da;
    });
  }, [person.callHistory, person.attendanceHistory]);

  const handleSelect = React.useCallback((checked: boolean) => {
    onSelect?.(checked);
  }, [onSelect]);

  const handleEdit = React.useCallback(() => onEdit(person), [onEdit, person]);
  const handleDelete = React.useCallback(() => onDelete(person.id), [onDelete, person.id]);
  const handleCall = React.useCallback(() => onStartCall(person), [onStartCall, person]);
  const handleRestore = React.useCallback(() => onRestore?.(person.id), [onRestore, person.id]);

  const handleDirectCall = React.useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (Capacitor.isNativePlatform()) {
        try {
            const permissions = await CallLog.checkPermissions();
            if (permissions.callLog !== 'granted') {
                const result = await CallLog.requestPermissions();
                if (result.callLog !== 'granted') {
                    toast({ variant: 'destructive', title: 'Permission Denied' });
                    return;
                }
            }
            // Execute native dialer
            await CallLog.makeCall({ phoneNumber: String(person.phone) });
            
            // Manual Trigger for Overlay: Outgoing broadcasts are restricted on Android 10+,
            // so we push the context window manually for calls started from inside the app.
            await CallLog.showNativeOverlay({
                name: person.fullName,
                phone: person.phone,
                photoUrl: person.photoUrl || '',
                stage: person.currentFolkStage || 'Fresh Lead',
                remark: person.lastCallRemark || '',
                type: 'OUTGOING'
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Call Failed' });
        }
    } else {
        window.location.href = `tel:${person.phone}`;
    }
  }, [person.phone, person.fullName, person.photoUrl, person.currentFolkStage, person.lastCallRemark, toast]);

  return (
    <React.Fragment>
      <TableRow className={cn("group/row transition-all border-b border-border h-20", isOpen && "bg-muted/30", person.isDeleted && "bg-red-500/5")}>
        <TableCell className="px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setIsOpen(!isOpen)}>
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")} />
            </Button>
            {onSelect && (
              <Checkbox checked={isSelected} onCheckedChange={handleSelect} className="h-5 w-5 rounded-md border-border" />
            )}
          </div>
        </TableCell>
        
        <TableCell className="px-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-border shadow-xl shrink-0">
              <AvatarImage src={person.photoUrl} className="object-cover" />
              <AvatarFallback className="font-black bg-muted text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link href={`/contacts/profile?id=${person.id}${navigationContext?.scope ? `&scope=${navigationContext.scope}` : ''}`} className="font-black text-base hover:text-primary transition-colors truncate text-foreground leading-none uppercase">
                  {fullName}
                </Link>
                {person.verifiedByFg === 'Yes' && <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />}
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1.5">{person.phone}</p>
            </div>
          </div>
        </TableCell>

        {visibleColumns.folkStage && <TableCell className="px-4"><FolkStageDisplay stage={person.currentFolkStage} /></TableCell>}
        {visibleColumns.location && <TableCell className="px-4 font-black text-xs text-foreground/80">{person.location || 'N/A'}</TableCell>}
        {visibleColumns.chanting && <TableCell className="px-4 font-black text-xs text-orange-500">{person.chantingStatus || 0} Rounds</TableCell>}
        {visibleColumns.enabler && <TableCell className="px-4 font-black text-xs text-foreground/80 whitespace-nowrap">{person.enablerInTouchWith || 'Unassigned'}</TableCell>}
        {visibleColumns.relationshipStatus && <TableCell className="px-4 font-black text-xs text-muted-foreground">{person.relationshipStatus || 'Single'}</TableCell>}
        
        {visibleColumns.lastCalled && (
          <TableCell className="px-4 text-[11px] font-bold text-muted-foreground whitespace-nowrap uppercase">
            {lastCallDate ? formatDistanceToNow(lastCallDate, { addSuffix: true }) : 'Never'}
          </TableCell>
        )}

        {visibleColumns.createdAt && (
          <TableCell className="px-4 text-[11px] font-bold text-muted-foreground whitespace-nowrap">
            {registeredDate ? format(registeredDate, 'dd MMM yyyy') : 'N/A'}
          </TableCell>
        )}

        {visibleColumns.lastCallRemark && (
          <TableCell className="px-4 max-w-[200px]">
            <p className="text-[11px] font-bold text-muted-foreground truncate italic">"{person.lastCallRemark || 'No notes'}"</p>
          </TableCell>
        )}

        <TableCell className="text-right pr-8">
          <div className="flex items-center justify-end gap-1">
            {onRestore ? (
              <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRestore}
                  className="h-9 px-4 font-black uppercase text-[10px] tracking-widest rounded-xl bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-600 hover:text-white transition-all"
              >
                  <RotateCcw className="h-3.5 w-3.5 mr-2" /> Restore
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={handleDirectCall}>
                  <PhoneCall className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border text-foreground w-48">
                    <DropdownMenuItem onClick={handleCall} className="font-bold">Log Interaction</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleEdit}>Edit Profile</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive font-bold" onClick={handleDelete}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>

      {isOpen && (
        <TableRow className="bg-muted/5 hover:bg-muted/5 border-none">
          <TableCell colSpan={24} className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-b border-border animate-in fade-in slide-in-from-top-2">
              <div className="md:col-span-3 p-8 flex flex-col items-center text-center space-y-6">
                <Avatar className="h-32 w-32 rounded-[2rem] border-4 border-muted shadow-2xl"><AvatarImage src={person.photoUrl} className="object-cover" /><AvatarFallback className="text-3xl font-black">{initials}</AvatarFallback></Avatar>
                <div className="space-y-1"><h4 className="font-black text-xl text-foreground uppercase">{person.fullName}</h4><p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">{person.currentFolkStage}</p></div>
              </div>
              <div className="md:col-span-4 p-8 space-y-6 bg-muted/10"><h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><Anchor className="h-4 w-4" /> Context Data</h4>
                <div className="space-y-4">
                  {[["Native Place", person.nativePlace], ["Organisation", person.organisation || person.occupation], ["Staying With", person.stayingWith], ["Folk Guide", person.folkGuide]].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between border-b border-border pb-2"><span className="text-[10px] font-bold text-muted-foreground uppercase">{l}</span><span className="text-xs font-black text-foreground">{v || 'N/A'}</span></div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-5 p-8 space-y-4"><h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2"><History className="h-4 w-4" /> Milestone Pulse</h4>
                <ScrollArea className="h-48 pr-4">
                  <div className="space-y-4">
                    {unifiedHistory.length > 0 ? unifiedHistory.map((log: any, idx) => (
                      <div key={idx} className="flex gap-4 relative pb-4"><div className="flex flex-col items-center"><div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-muted border border-border text-muted-foreground/50"><Clock className="h-3.5 w-3.5" /></div>{idx < unifiedHistory.length - 1 && <div className="w-px flex-1 bg-border my-1" />}</div>
                        <div className="flex-1 space-y-1"><div className="flex items-center justify-between"><span className="text-[10px] font-black text-muted-foreground">{format(safeDate(log.calledAt)!, 'dd MMM, p')}</span><Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-2">{log.status}</Badge></div><p className="text-[11px] font-bold text-foreground/70 italic">"{log.remark || 'Interaction logged.'}"</p></div>
                      </div>
                    )) : <div className="text-center py-10 text-muted-foreground uppercase font-black text-[10px]">No interactions found</div>}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
};

export const PersonTableRow = React.memo(PersonTableRowComponent, (prev, next) => {
    return (
        prev.isSelected === next.isSelected &&
        prev.person.id === next.person.id &&
        prev.person.lastCallAt === next.person.lastCallAt &&
        prev.visibleColumns === next.visibleColumns
    );
});