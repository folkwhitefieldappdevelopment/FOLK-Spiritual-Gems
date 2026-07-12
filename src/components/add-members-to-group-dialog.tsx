'use client';

import * as React from 'react';
import { useDebounce } from 'use-debounce';
import { 
  Search, 
  Upload, 
  Phone, 
  Loader2, 
  Check, 
  UserPlus, 
  FileSpreadsheet, 
  X,
  AlertCircle,
  Plus
} from 'lucide-react';
import type { Person, Group, UserRole } from '@/lib/types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAppToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import { getPeople } from '@/services/people-service';
import { addPeopleToGroup } from '@/services/groups-service';
import { addPeopleToGroupByPhone } from '@/services/groups-actions';
import { cn } from '@/lib/utils';

type AddMembersToGroupDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  groupId: string;
  groupName: string;
  existingMemberIds: string[];
  onSuccess: () => void;
};

export function AddMembersToGroupDialog({
  isOpen,
  setIsOpen,
  groupId,
  groupName,
  existingMemberIds,
  onSuccess,
}: AddMembersToGroupDialogProps) {
  const { appUser } = useAuth();
  const { toast } = useAppToast();
  const [activeTab, setActiveTab] = React.useState<'search' | 'excel' | 'phone'>('search');
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = React.useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 400);
  const [searchResults, setSearchResults] = React.useState<Person[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedSearchIds, setSelectedSearchIds] = React.useState<Set<string>>(new Set());

  // Phone Paste State
  const [phoneList, setPhoneList] = React.useState('');

  // Excel State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [excelFile, setExcelFile] = React.useState<File | null>(null);

  // Automatic Instant Search Effect
  React.useEffect(() => {
    if (activeTab === 'search' && debouncedQuery.trim().length >= 2) {
        handleSearch(debouncedQuery);
    } else if (debouncedQuery.trim().length < 2) {
        setSearchResults([]);
    }
  }, [debouncedQuery, activeTab]);

  React.useEffect(() => {
    if (!isOpen) {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedSearchIds(new Set());
        setPhoneList('');
        setExcelFile(null);
    }
  }, [isOpen]);

  // Handle Search
  const handleSearch = async (queryStr: string) => {
    if (!appUser) return;
    setIsSearching(true);
    try {
      const isNumeric = /^[0-9]+$/.test(queryStr);
      const { people } = await getPeople(appUser, {
        scope: 'all',
        filters: { 
            name: isNumeric ? undefined : queryStr,
            phone: isNumeric ? queryStr : undefined
        },
        ignoreLimit: true
      });
      
      // Filter out those already in the group
      const nonMembers = people.filter(p => !(existingMemberIds || []).includes(p.id));
      setSearchResults(nonMembers);
    } catch (e) {
      console.warn("Search sync error", e);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSearchSelection = (id: string) => {
    setSelectedSearchIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Actions
  const handleAddFromSearch = async () => {
    if (selectedSearchIds.size === 0 || !appUser) return;
    setIsProcessing(true);
    try {
      await addPeopleToGroup(groupId, Array.from(selectedSearchIds), { id: appUser.id, name: appUser.name, role: appUser.role });
      toast({ title: "Members Added", description: `Successfully added ${selectedSearchIds.size} people to ${groupName}.` });
      setIsOpen(false);
      onSuccess();
    } catch (e) {
      toast({ variant: 'destructive', title: "Failed to add members" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddFromPhones = async () => {
    if (!phoneList.trim() || !appUser) return;
    setIsProcessing(true);
    const phones = phoneList.split(/[\n,]/).map(p => p.trim()).filter(p => p.length >= 10);
    try {
      const result = await addPeopleToGroupByPhone(groupId, phones, { id: appUser.id, name: appUser.name, role: appUser.role });
      toast({ 
        title: "Import Complete", 
        description: `Added ${result.addedCount} new members. ${result.notFoundCount} numbers not found in database.`
      });
      setIsOpen(false);
      onSuccess();
    } catch (e) {
      toast({ variant: 'destructive', title: "Import Failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !appUser) return;
    
    setIsProcessing(true);
    const XLSX = await import('xlsx');
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data: any[] = XLSX.utils.sheet_to_json(ws);
            
            // Look for 'Phone' or 'phone' columns
            const phones = data.map(row => String(row['Phone'] || row['phone'] || '')).filter(p => p.length >= 10);
            
            if (phones.length === 0) {
                toast({ variant: 'destructive', title: "Invalid File", description: "No valid phone numbers found in the first sheet." });
                return;
            }

            const result = await addPeopleToGroupByPhone(groupId, phones, { id: appUser.id, name: appUser.name, role: appUser.role });
            toast({ 
                title: "Excel Import Complete", 
                description: `Added ${result.addedCount} matching members to the group.`
            });
            setIsOpen(false);
            onSuccess();
        } catch (error) {
            toast({ variant: 'destructive', title: "Excel Failed" });
        } finally {
            setIsProcessing(false);
            if (e.target) e.target.value = '';
        }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/30">
          <DialogTitle className="text-xl font-black">Add Members to Group</DialogTitle>
          <DialogDescription className="text-primary font-bold">{groupName}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 h-11 p-1 rounded-xl">
              <TabsTrigger value="search" className="font-black text-[10px] uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Search className="h-3.5 w-3.5 mr-2" /> Search App
              </TabsTrigger>
              <TabsTrigger value="excel" className="font-black text-[10px] uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Excel
              </TabsTrigger>
              <TabsTrigger value="phone" className="font-black text-[10px] uppercase tracking-widest rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Phone className="h-3.5 w-3.5 mr-2" /> Phone List
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 pt-4">
            <TabsContent value="search" className="mt-0 space-y-4">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name or number (min 2 chars)..." 
                    className="pl-10 h-12 rounded-xl text-base font-medium border-2 focus-visible:ring-primary shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary opacity-50" />
                      </div>
                  )}
              </div>

              <ScrollArea className="h-[320px] border rounded-2xl bg-muted/10 p-2">
                {searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.map(p => (
                      <div 
                        key={p.id} 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl transition-colors cursor-pointer group",
                          selectedSearchIds.has(p.id) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50 border border-transparent"
                        )}
                        onClick={() => toggleSearchSelection(p.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selectedSearchIds.has(p.id)} onCheckedChange={() => toggleSearchSelection(p.id)} />
                          <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarImage src={p.photoUrl} className="object-cover" />
                            <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">{p.fullName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-black truncate">{p.fullName}</p>
                            <p className="text-[10px] font-bold text-muted-foreground">{p.phone}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            selectedSearchIds.has(p.id) ? "bg-primary text-white border-primary" : "opacity-0 group-hover:opacity-100"
                        )}>
                          {selectedSearchIds.has(p.id) ? "Selected" : "Select"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : debouncedQuery.trim().length >= 2 && !isSearching ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                    <AlertCircle className="h-12 w-12 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No matching contacts found</p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
                    <Search className="h-12 w-12 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">
                        {debouncedQuery.trim().length > 0 ? "Searching..." : "Type name or phone to find contacts"}
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="excel" className="mt-0 py-8 text-center space-y-6">
              <div 
                className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-tight">Upload Spreadsheet</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Select an Excel or CSV file. We will look for a column named "Phone" and add matching contacts to the group.
                </p>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="rounded-xl font-bold px-8">
                Choose File
              </Button>
            </TabsContent>

            <TabsContent value="phone" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pasted Phone Numbers</Label>
                <Textarea 
                  placeholder="Paste numbers here...&#10;9876543210&#10;8877665544" 
                  className="min-h-[240px] font-mono text-sm rounded-2xl p-4 bg-muted/20 border-2"
                  value={phoneList}
                  onChange={(e) => setPhoneList(e.target.value)}
                />
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic px-2">
                    <AlertCircle className="h-3 w-3" /> Numbers must be at least 10 digits long.
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-6 pt-2 border-t bg-muted/30">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">Cancel</Button>
          {activeTab === 'search' && (
            <Button onClick={handleAddFromSearch} disabled={selectedSearchIds.size === 0 || isProcessing} className="rounded-xl font-black px-8">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Selected ({selectedSearchIds.size})
            </Button>
          )}
          {activeTab === 'phone' && (
            <Button onClick={handleAddFromPhones} disabled={!phoneList.trim() || isProcessing} className="rounded-xl font-black px-8">
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Import & Add
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
