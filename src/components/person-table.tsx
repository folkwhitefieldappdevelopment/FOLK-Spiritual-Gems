'use client';

import * as React from 'react';
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LayoutGrid, 
  List, 
  Settings2, 
  ChevronDown, 
  Users, 
  CheckCircle2,
  Loader2,
  ListChecks
} from 'lucide-react';
import type { Person, Group } from '@/lib/types';
import { PersonTableRow } from './person-table-row';
import { PersonCard } from './person-card';
import { PersonTableRowSkeleton, PersonCardSkeleton } from './skeleton-loaders';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

type PersonTableProps = {
  people: Person[];
  onEdit: (person: Person) => void;
  onDelete: (personId: string) => void;
  onStartCall: (person: Person) => void;
  selectedIds?: Set<string>;
  setSelectedIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
  isSelectionActive?: boolean;
  allGroups?: Group[];
  showEnablerColumn?: boolean;
  showCoEnablerColumn?: boolean;
  navigationContext?: { groupId?: string; scope?: string };
  totalCount?: number | null;
  onSelectAllGlobal?: () => void;
  isSelectingAll?: boolean;
  isLoading?: boolean;
};

const STORAGE_KEY = 'folk_crm_table_columns_v2';

const DEFAULT_COLUMNS = {
  phone: false,
  age: false,
  folkStage: true,
  location: true,
  stayingWith: false,
  occupation: false,
  organisation: false,
  rentDetails: false,
  nativePlace: false,
  sgRating: false,
  contactSource: false,
  chanting: true,
  fromOtherCamp: false,
  enabler: true,
  folkGuide: false,
  folkId: false,
  relationshipStatus: true,
  verifiedByFg: false,
  lastCalled: true,
  createdAt: true,
  lastCallRemark: true,
  progress: false,
};

const COLUMN_LABELS: Record<string, string> = {
  phone: "PHONE",
  age: "AGE",
  folkStage: "FOLK STAGE",
  location: "LOCATION",
  stayingWith: "ACCOMMODATION",
  occupation: "OCCUPATION",
  organisation: "ORGANISATION",
  rentDetails: "RENT",
  nativePlace: "NATIVE PLACE",
  sgRating: "RATING",
  contactSource: "SOURCES",
  chanting: "CHANTING",
  fromOtherCamp: "OTHER CAMP",
  enabler: "PRIMARY ENABLER",
  folkGuide: "FOLK GUIDE",
  folkId: "FOLK ID",
  relationshipStatus: "RELATIONSHIP",
  verifiedByFg: "VERIFIED",
  lastCalled: "LAST CONTACT",
  createdAt: "REGISTERED DATE",
  lastCallRemark: "LAST REMARK",
  progress: "PROGRESS",
};

export function PersonTable({
  people,
  onEdit,
  onDelete,
  onStartCall,
  selectedIds,
  setSelectedIds,
  isSelectionActive = false,
  allGroups = [],
  showEnablerColumn = true,
  showCoEnablerColumn = false,
  navigationContext,
  totalCount,
  onSelectAllGlobal,
  isSelectingAll = false,
  isLoading = false,
}: PersonTableProps) {
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [visibleColumns, setVisibleColumns] = React.useState<Record<string, boolean>>(DEFAULT_COLUMNS);
  
  const [rangeFrom, setRangeFrom] = React.useState("1");
  const [rangeTo, setRangeTo] = React.useState("60");

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setVisibleColumns({ ...DEFAULT_COLUMNS, ...parsed });
      } catch (e) {
        console.error("Failed to parse column preferences");
      }
    }
    setIsLoaded(true);
  }, []);

  const toggleColumn = React.useCallback((col: string) => {
    setVisibleColumns(prev => {
      const next = { ...prev, [col]: !prev[col] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleSelectAllOnPage = React.useCallback((checked: boolean) => {
    if (!setSelectedIds) return;
    if (checked) {
      const pageIds = people.map(p => p.id);
      setSelectedIds(prev => new Set([...Array.from(prev), ...pageIds]));
    } else {
      const pageIds = new Set(people.map(p => p.id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageIds.forEach(id => next.delete(id));
        return next;
      });
    }
  }, [people, setSelectedIds]);

  const handleSelectRange = React.useCallback((fromStr: string, toStr: string) => {
    if (!setSelectedIds) return;
    const from = parseInt(fromStr);
    const to = parseInt(toStr);
    if (isNaN(from) || isNaN(to)) return;
    const start = Math.max(0, from - 1);
    const end = Math.min(people.length, to);
    if (start >= end) return;
    const idsToSelect = people.slice(start, end).map(p => p.id);
    setSelectedIds(prev => new Set([...Array.from(prev), ...idsToSelect]));
  }, [people, setSelectedIds]);

  const handleSelectOne = React.useCallback((id: string, checked: boolean) => {
    if (!setSelectedIds) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, [setSelectedIds]);

  const isAllOnPageSelected = React.useMemo(() => {
      return !!selectedIds && people.length > 0 && people.every(p => selectedIds.has(p.id));
  }, [selectedIds, people]);

  if (!isLoaded || (isLoading && people.length === 0)) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2 mb-4">
           <Skeleton className="h-9 w-24 rounded-lg" />
           <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        {viewMode === 'table' ? (
          <div className="border rounded-xl bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow><TableHead className="w-[100px]"><Skeleton className="h-4 w-4" /></TableHead><TableHead><Skeleton className="h-4 w-32" /></TableHead><TableHead><Skeleton className="h-4 w-24" /></TableHead><TableHead className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableHead></TableRow>
              </TableHeader>
              <TableBody>{[...Array(8)].map((_, i) => (<PersonTableRowSkeleton key={i} showEnabler={showEnablerColumn} />))}</TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (<PersonCardSkeleton key={i} />))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            {totalCount !== null && (
                <Badge variant="secondary" className="px-4 py-2 font-black bg-primary/5 text-primary border-primary/20 text-[10px] uppercase tracking-widest rounded-xl">
                    {totalCount} Total Contacts
                </Badge>
            )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1b1d32] p-1 rounded-2xl border border-white/5 shadow-inner">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={cn(
                "h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all", 
                viewMode === 'table' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white"
              )}
            >
              <List className="h-3.5 w-3.5 mr-2" />
              TABLE
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                "h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all", 
                viewMode === 'grid' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-2" />
              GRID
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-12 px-6 font-black uppercase tracking-widest text-[10px] rounded-2xl border-white/5 bg-[#1b1d32] text-white hover:bg-white/10 shadow-2xl">
                <Settings2 className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-0 overflow-hidden flex flex-col rounded-3xl shadow-2xl border-none bg-[#1e1e2e] text-white">
              <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 p-4">VISIBLE ATTRIBUTES</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5 m-0" />
              <div className="max-h-[350px] overflow-y-auto p-2 scrollbar-hide">
                  {Object.keys(COLUMN_LABELS).map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col}
                      className="capitalize text-[11px] font-bold py-3 px-4 focus:bg-primary/20 rounded-xl cursor-pointer"
                      checked={visibleColumns[col]}
                      onCheckedChange={() => toggleColumn(col)}
                    >
                      {COLUMN_LABELS[col]}
                    </DropdownMenuCheckboxItem>
                  ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-[#1b1d32]/30 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto scrollbar-hide">
            <Table>
              <TableHeader className="bg-black/20">
                <TableRow className="hover:bg-transparent border-b border-white/5 h-20">
                  <TableHead className="w-[100px] px-8">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isAllOnPageSelected}
                        onCheckedChange={handleSelectAllOnPage}
                        className="h-5 w-5 rounded-md border-white/20"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0 rounded-lg hover:bg-white/5">
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-6 rounded-[2rem] shadow-2xl border-none bg-[#1e1e2e] text-white" align="start">
                          <div className="space-y-6">
                            <div className="flex items-center gap-3">
                              <ListChecks className="h-6 w-6 text-primary" />
                              <h4 className="font-black text-sm uppercase tracking-tight">Precision Selection</h4>
                            </div>
                            <div className="grid gap-3">
                              <Button variant="outline" size="sm" className="justify-start font-black uppercase text-[10px] h-12 rounded-xl bg-white/5 border-white/10 text-white" onClick={() => handleSelectAllOnPage(true)}>Select This Page ({people.length})</Button>
                              {onSelectAllGlobal && totalCount !== null && totalCount > people.length && (
                                <Button size="sm" className="justify-start font-black uppercase text-[10px] h-12 rounded-xl shadow-xl shadow-primary/20" onClick={onSelectAllGlobal} disabled={isSelectingAll}>
                                  {isSelectingAll ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Selecting Database...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Select All {totalCount} Contacts</>}
                                </Button>
                              )}
                              <div className="space-y-3 pt-2 border-t border-white/5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select Row Range</Label>
                                <div className="flex items-end gap-3">
                                  <div className="flex-1 space-y-1.5">
                                    <Label className="text-[9px] uppercase opacity-50 ml-1">From</Label>
                                    <Input type="number" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="h-10 bg-[#161623] border-none text-white font-black rounded-lg" />
                                  </div>
                                  <div className="flex-1 space-y-1.5">
                                    <Label className="text-[9px] uppercase opacity-50 ml-1">To</Label>
                                    <Input type="number" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="h-10 bg-[#161623] border-none text-white font-black rounded-lg" />
                                  </div>
                                  <Button size="sm" className="h-10 font-black px-6 rounded-lg" onClick={() => handleSelectRange(rangeFrom, rangeTo)}>Select</Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-500 min-w-[300px]">CONTACT PROFILE</TableHead>
                  {Object.keys(COLUMN_LABELS).map(key => (
                    visibleColumns[key] && (
                      <TableHead key={key} className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap px-6">
                        {COLUMN_LABELS[key]}
                      </TableHead>
                    )
                  ))}
                  <TableHead className="text-right pr-10 font-black text-[11px] uppercase tracking-[0.2em] text-slate-500"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.length > 0 ? (
                  people.map((person, index) => (
                    <PersonTableRow
                      key={person.id}
                      person={person}
                      index={index + 1}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStartCall={onStartCall}
                      isSelected={!!selectedIds && selectedIds.has(person.id)}
                      onSelect={(checked) => handleSelectOne(person.id, checked)}
                      allGroups={allGroups}
                      visibleColumns={visibleColumns}
                      showEnablerColumn={showEnablerColumn}
                      navigationContext={navigationContext}
                    />
                  ))
                ) : (
                  <TableRow><TableCell colSpan={24} className="h-64 text-center opacity-30"><Users className="h-12 w-12 mx-auto mb-4" /><p className="font-black text-xs uppercase tracking-widest">No matching records</p></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              isSelected={!!selectedIds && selectedIds.has(person.id)}
              onSelectionChange={handleSelectOne}
              groups={allGroups}
              isSelectionActive={isSelectionActive}
              navigationContext={navigationContext}
            />
          ))}
        </div>
      )}
    </div>
  );
}
