
"use client";

import * as React from "react";
import {
  List,
  PlusCircle,
  LayoutGrid,
  Upload,
  Trash2,
  Users,
  Loader2,
  UserCheck,
  Search,
  Info,
  UserPlus,
  Contact,
  Filter as FilterIcon,
  ArrowDownAZ,
} from "lucide-react";
import { read, utils, write, type WorkSheet } from "xlsx";
import JSZip from "jszip";
import { createInitialProgress } from "@/lib/data";
import type { Person, Group, AppUser, CustomField, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/page-header";
import { PersonCard } from "@/components/person-card";
import { PersonTable } from "@/components/person-table";
import { CreateUpdatePersonDialog } from "@/components/create-update-person-dialog";
import { FirebaseConfigError } from "@/components/firebase-config-error";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  getPeople,
  createPerson,
  updatePerson,
  deletePerson,
  deletePeople,
  importPeople,
  assignCoEnablerToPeople,
  assignEnablerToPeople,
} from "@/services/people-service";
import { getAllGroups, createGroup, addPeopleToGroup } from "@/services/groups-service";
import { getFolkGuides, getUsers } from "@/services/user-service";
import { getCustomPersonFields, getEnablers, getContactSources, getOccupationStatuses, getStayingWithOptions, type EnablerOption } from "@/services/settings-service";
import { useAuth } from "@/contexts/auth-context";
import { CreateUpdateGroupDialog } from "@/components/create-update-group-dialog";
import { AssignCoEnablerDialog } from "@/components/assign-helper-dialog";
import { AssignEnablerDialog } from "@/components/assign-enabler-dialog";
import { Input } from "@/components/ui/input";
import { logAudit } from '@/services/audit-service';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FilterPopover, type FilterRule, type FilterableField, applyClientSideFilters } from '@/components/filter-popover';
import { SortPopover, type SortDescriptor } from '@/components/sort-popover';
import { get } from 'lodash';


const ROWS_PER_PAGE = 25;
const FIRESTORE_QUERY_LIMIT = 10000;

type UserInfo = {
  id: string;
  name: string;
  role: UserRole[];
};

export default function ContactsPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allFetchedPeople, setAllFetchedPeople] = React.useState<Person[]>([]);
  const [allUsers, setAllUsers] = React.useState<AppUser[]>([]);
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [importingStatus, setImportingStatus] = React.useState<string | false>(false);
  const [isExporting, setIsExporting] = React.useState(false);
  
  const [view, setView] = React.useState<"table" | "card">("table");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filters, setFilters] = React.useState<FilterRule[]>([]);
  const [sortDescriptors, setSortDescriptors] = React.useState<SortDescriptor[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = React.useState(false);
  const [isAssignCoEnablerDialogOpen, setIsAssignCoEnablerDialogOpen] = React.useState(false);
  const [isAssignEnablerDialogOpen, setIsAssignEnablerDialogOpen] = React.useState(false);

  const [editingPerson, setEditingPerson] = React.useState<Person | undefined>(undefined);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [enablerOptions, setEnablerOptions] = React.useState<EnablerOption[]>([]);
  const [contactSourceOptions, setContactSourceOptions] = React.useState<string[]>([]);
  const [occupationOptions, setOccupationOptions] = React.useState<string[]>([]);
  const [stayingWithOptions, setStayingWithOptions] = React.useState<string[]>([]);
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [folkGuides, setFolkGuides] = React.useState<AppUser[]>([]);

  const canAssignUsers = appUser?.role.includes('Admin') || appUser?.role.includes('Folk Guide');
  const isAdmin = appUser?.role.includes('Admin');
  const isGuide = appUser?.role.includes('Folk Guide');
  const isEnablerOnly = appUser?.role.includes('Folk Enabler') && !isAdmin && !isGuide;
  
  // Set initial state from URL search params
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const page = parseInt(params.get('page') || '1', 10);
    const view = params.get('view') as 'table' | 'card' || 'table';
    const search = params.get('search') || '';
    const sort = params.get('sort');
    const filter = params.get('filters');

    setCurrentPage(page);
    setView(view);
    setSearchTerm(search);
    if (sort) {
      try { setSortDescriptors(JSON.parse(sort)); } catch(e) {}
    } else {
      setSortDescriptors([{ field: 'createdAt', direction: 'desc' }]);
    }
    if (filter) {
      try { setFilters(JSON.parse(filter)); } catch(e) {}
    }
  }, []); // Run only once on mount

  // Update URL when state changes
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', String(currentPage));
    if (view !== 'table') params.set('view', view);
    if (searchTerm) params.set('search', searchTerm);
    if (sortDescriptors.length > 0 && !(sortDescriptors.length === 1 && sortDescriptors[0].field === 'createdAt' && sortDescriptors[0].direction === 'desc')) {
      params.set('sort', JSON.stringify(sortDescriptors));
    }
    if (filters.length > 0) params.set('filters', JSON.stringify(filters));
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [currentPage, view, searchTerm, sortDescriptors, filters, router, pathname]);

  const fetchPageData = React.useCallback(async () => {
    if (!appUser) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
      const { people: peopleData, totalCount } = await getPeople(userInfo, { pageSize: FIRESTORE_QUERY_LIMIT });
      setAllFetchedPeople(peopleData);
      
      const [allUsersData, groupsData, enablersData, sourcesData, occupationsData, stayingsData, guidesData, customFieldsData] = await Promise.all([
        getUsers(),
        getAllGroups(userInfo),
        getEnablers(userInfo, 'filter'),
        getContactSources(userInfo),
        getOccupationStatuses(userInfo),
        getStayingWithOptions(userInfo),
        getFolkGuides(),
        getCustomPersonFields(userInfo),
      ]);
      setAllUsers(allUsersData);
      setGroups(groupsData);
      setEnablerOptions(enablersData);
      setContactSourceOptions(sourcesData);
      setOccupationOptions(occupationsData);
      setStayingWithOptions(stayingsData);
      setFolkGuides(guidesData);
      setCustomFields(customFieldsData);
    } catch (error) {
      console.error("Failed to load data:", error);
      if (error instanceof Error) {
          setFetchError(error);
      } else {
          setFetchError(new Error("An unknown error occurred while fetching data."));
      }
    } finally {
      setIsLoading(false);
    }
  }, [appUser]);

  React.useEffect(() => {
    if (appUser) {
      fetchPageData();
    }
  }, [appUser, fetchPageData]);
  
  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, view, filters, sortDescriptors]);

  const filterableFields: FilterableField[] = React.useMemo(() => {
    const standardFields: FilterableField[] = [
      { value: 'occupation', label: 'Occupation', type: 'enum', options: occupationOptions.map(s => ({ value: s, label: s })) },
      { value: 'contactSource', label: 'Contact Source', type: 'enum', options: contactSourceOptions.map(s => ({ value: s, label: s })) },
      { value: 'enablerInTouchWith', label: 'Enabler', type: 'enum', options: enablerOptions },
      { value: 'chantingStatus', label: 'Chanting Rounds', type: 'number' },
      { value: 'stayingWith', label: 'Staying At', type: 'enum', options: stayingWithOptions.map(s => ({ value: s, label: s })) },
      { value: 'organisation', label: 'Organisation', type: 'string' },
      { value: 'folkGuide', label: 'Folk Guide', type: 'enum', options: folkGuides.map(g => ({ value: g.name, label: `${g.name} (${g.fgCode || 'N/A'})` })) },
      { value: 'nativePlace', label: 'Native Place', type: 'string' },
      { value: 'fromOtherCamp', label: 'From Other Camp', type: 'boolean' },
      { value: 'age', label: 'Age', type: 'number' },
      { value: 'sgRating', label: 'Rating', type: 'number' },
    ];
    
    const dynamicFields: FilterableField[] = customFields.map(cf => {
        if (cf.type === 'dropdown') {
            return {
                value: `customData.${cf.id}`,
                label: cf.label,
                type: 'enum',
                options: (cf.options || []).map(opt => ({ value: opt, label: opt })),
            }
        }
        return {
            value: `customData.${cf.id}`,
            label: cf.label,
            type: cf.type as 'string' | 'number' | 'boolean' | 'date',
        }
    });

    return [...standardFields, ...dynamicFields];
  }, [enablerOptions, contactSourceOptions, folkGuides, occupationOptions, stayingWithOptions, customFields]);
  
  const filteredAndSortedPeople = React.useMemo(() => {
    let people = [...allFetchedPeople];
    
    // Apply main search term
    if (searchTerm.trim()) {
        const lowercasedTerm = searchTerm.toLowerCase();
        people = people.filter(p => 
            p.fullName.toLowerCase().includes(lowercasedTerm) || 
            p.phone.includes(lowercasedTerm)
        );
    }

    // Apply advanced filters
    people = applyClientSideFilters(people, filters);

    // Apply sorting
    if (sortDescriptors.length > 0) {
        people.sort((a, b) => {
            for (const desc of sortDescriptors) {
                const valA = get(a, desc.field);
                const valB = get(b, desc.field);
                let comparison = 0;
                if (valA === null || valA === undefined) comparison = -1;
                else if (valB === null || valB === undefined) comparison = 1;
                else if (valA > valB) comparison = 1;
                else if (valA < valB) comparison = -1;
                if (comparison !== 0) {
                    return desc.direction === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }

    return people;
  }, [allFetchedPeople, searchTerm, filters, sortDescriptors]);

  const totalPages = Math.ceil(filteredAndSortedPeople.length / ROWS_PER_PAGE);
  const paginatedPeople = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAndSortedPeople.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [filteredAndSortedPeople, currentPage]);

  const handleSampleDownload = React.useCallback(async () => {
    if (!appUser) return;
    let enablersUnderGuide: AppUser[] = [];
    if (isGuide) {
      // This is a temporary solution as getEnablersForGuide is not available here.
      // A better solution would be to pass this data down or refactor the service.
      enablersUnderGuide = allUsers.filter(u => u.reportsTo?.guideId === appUser.id);
    }
    
    const baseHeaders = [
      "fullName", "phone", "photoUrl", "age", "stayingWith",
      "occupation", "organisation", "rentDetails", "nativePlace", "sgRating",
      "contactSource", "chantingStatus", "fromOtherCamp",
      "generalRemarks", "lastCallRemark",
    ];

    let fullHeaders = [...baseHeaders];
    if (!isEnablerOnly) {
      fullHeaders.push("enablerInTouchWith");
    }
    if (isAdmin) {
      fullHeaders.push("folkGuide");
    }

    const customHeaders = customFields.map(f => f.label);
    const headers = [...fullHeaders, ...customHeaders];

    const dummyContact: {[key: string]: any} = {
      fullName: "John Doe", phone: "9876543210", photoUrl: "https://placehold.co/100x100.png",
      age: 25, stayingWith: "PG / Hostel", occupation: "Working", organisation: "Acme Inc.",
      rentDetails: "7000/month", nativePlace: "Mumbai", sgRating: 4, contactSource: "Govinda Temple",
      chantingStatus: 4, fromOtherCamp: false,
      generalRemarks: "Is progressing well in spiritual life.", lastCallRemark: "Confirmed for Sunday feast.",
    };

    let enablerList: string[] = [];
    let guideList: string[] = [];

    if (!isEnablerOnly) {
      if (isAdmin) {
          enablerList = allUsers
            .filter(u => u.role.includes('Folk Enabler') || u.role.includes('Folk Guide'))
            .map(u => u.name)
            .sort();
      } else if (isGuide) {
          enablerList = [appUser.name, ...enablersUnderGuide.map(e => e.name)].sort();
      }
      dummyContact.enablerInTouchWith = enablerList[0] || '';
    }
    
    if (isAdmin) {
      guideList = folkGuides.map(g => `${g.name} (${g.fgCode || 'N/A'})`).sort();
      dummyContact.folkGuide = guideList[0] || '';
    }

    customFields.forEach(f => {
      dummyContact[f.label] = f.type === 'number' ? 123 : f.type === 'boolean' ? true : `Sample ${f.type} data`;
    });

    const workbook = utils.book_new();

    // 1. Create Instructions Sheet
    const instructionsData = [
        { Column: 'fullName', Instruction: 'Required. Full name of the contact.', Example: 'John Doe' },
        { Column: 'phone', Instruction: 'Required. 10-digit Indian mobile number without country code.', Example: '9876543210' },
        { Column: 'photoUrl', Instruction: 'Optional. A public URL to an image.', Example: 'https://placehold.co/100x100.png' },
        { Column: 'age', Instruction: 'Optional. A number between 16 and 40.', Example: '25' },
        { Column: 'stayingWith', Instruction: 'Optional. Must be one of: PG / Hostel, Flat, Family.', Example: 'PG / Hostel' },
        { Column: 'occupation', Instruction: 'Optional. Must be one of: Working, Student, Searching for job.', Example: 'Working' },
        { Column: 'organisation', Instruction: 'Optional. Name of company or college.', Example: 'Acme Inc.' },
        { Column: 'rentDetails', Instruction: 'Optional. Text field for rent details.', Example: '7000/month' },
        { Column: 'nativePlace', Instruction: 'Optional. Text field for native place.', Example: 'Mumbai' },
        { Column: 'sgRating', Instruction: 'Optional. A number from 0 to 5.', Example: '4' },
        { Column: 'contactSource', Instruction: 'Optional. Source from where contact was acquired.', Example: 'Govinda Temple' },
        { Column: 'chantingStatus', Instruction: 'Optional. Number of rounds chanted per day.', Example: '4' },
        { Column: 'fromOtherCamp', Instruction: 'Optional. Enter TRUE or FALSE.', Example: 'FALSE' },
        { Column: 'generalRemarks', Instruction: 'Optional. Any general notes about the contact.', Example: 'Is progressing well.' },
        { Column: 'lastCallRemark', Instruction: 'Optional. Remark from the most recent call.', Example: 'Confirmed for Sunday feast.' },
    ];
    if (!isEnablerOnly) {
        instructionsData.push({ Column: 'enablerInTouchWith', Instruction: 'Optional. Must be an exact name from the "Dropdown Values" sheet.', Example: enablerList[0] || 'Enabler Name' });
    }
    if (isAdmin) {
        instructionsData.push({ Column: 'folkGuide', Instruction: 'Optional. Must be an exact name from the "Dropdown Values" sheet.', Example: guideList[0] || 'Guide Name (FG01)' });
    }
    customFields.forEach(f => {
        instructionsData.push({ Column: f.label, Instruction: `Optional. Custom field of type: ${f.type}.`, Example: `Sample ${f.type} data` });
    });
    
    const instructionsSheet = utils.json_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 20 }, { wch: 80 }, { wch: 30 }];
    utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    // 2. Create Contacts Sheet
    const worksheet: WorkSheet = utils.json_to_sheet([dummyContact], { header: headers });
    
    const MAX_ROWS = 1000;
    if (!worksheet['!dataValidation']) worksheet['!dataValidation'] = [];

    if (!isEnablerOnly && enablerList.length > 0) {
        const enablerColIndex = headers.indexOf("enablerInTouchWith");
        if (enablerColIndex !== -1) {
            const enablerCol = utils.encode_col(enablerColIndex);
            worksheet['!dataValidation'].push({
                sqref: `${enablerCol}2:${enablerCol}${MAX_ROWS}`,
                validation: { type: "list", allowBlank: true, showDropDown: true, formulae: [`"=""&INDIRECT("'Dropdown Values'!B2:B${enablerList.length + 1}")`]}
            });
        }
    }

    if (isAdmin && guideList.length > 0) {
        const guideColIndex = headers.indexOf("folkGuide");
        if (guideColIndex !== -1) {
            const guideCol = utils.encode_col(guideColIndex);
            worksheet['!dataValidation'].push({
                sqref: `${guideCol}2:${guideCol}${MAX_ROWS}`,
                validation: { type: "list", allowBlank: true, showDropDown: true, formulae: [`"=""&INDIRECT("'Dropdown Values'!A2:A${guideList.length + 1}")`]}
            });
        }
    }
    
    utils.book_append_sheet(workbook, worksheet, "Contacts");
    
    // 3. Create Dropdown Values Sheet
    if (enablerList.length > 0 || guideList.length > 0) {
        const maxLength = Math.max(guideList.length, enablerList.length);
        const dropdownSheetData = [];
        for (let i = 0; i < maxLength; i++) {
            dropdownSheetData.push({
                "Valid Folk Guides": guideList[i] || '',
                "Valid Enablers": enablerList[i] || '',
            });
        }
        const dropdownWorksheet = utils.json_to_sheet(dropdownSheetData);
        dropdownWorksheet['!cols'] = [{ wch: 30 }, { wch: 30 }];
        utils.book_append_sheet(workbook, dropdownWorksheet, "Dropdown Values");
    }

    // Reorder sheets to put Instructions first
    if(workbook.SheetNames.length > 1) {
      const instructionsIndex = workbook.SheetNames.indexOf('Instructions');
      if (instructionsIndex > 0) {
        const instructionsSheetName = workbook.SheetNames.splice(instructionsIndex, 1)[0];
        workbook.SheetNames.unshift(instructionsSheetName);
      }
    }

    const excelBuffer = write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "contacts_sample.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, [customFields, isEnablerOnly, isAdmin, isGuide, appUser, folkGuides, allUsers]);

  const handleExport = React.useCallback(async () => {
    if (filteredAndSortedPeople.length === 0 || !appUser) {
      toast({
        variant: "destructive",
        title: "No Contacts to Export",
        description: "There are no contacts in the current view to export.",
      });
      return;
    }

    setIsExporting(true);
    
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    
    const zip = new JSZip();
    const photosFolder = zip.folder("photos");
    const exportData = [];

    const safeDate = (timestamp: any): string => {
        if (!timestamp) return '';
        const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return isNaN(d.getTime()) ? '' : d.toISOString();
    }

    for (const p of filteredAndSortedPeople) {
      let photoColumnValue = '';
      if (p.photoUrl) {
        if (p.photoUrl.startsWith('data:image')) {
          try {
            const extension = p.photoUrl.split(';')[0].split('/')[1] || 'png';
            const name = (p.fullName || 'contact').replace(/\s+/g, '_');
            const fileName = `${name}_${p.id}.${extension}`;
            photoColumnValue = `photos/${fileName}`;

            const response = await fetch(p.photoUrl);
            const blob = await response.blob();
            
            if (photosFolder) {
              photosFolder.file(fileName, blob);
            }

          } catch (e) {
            console.error(`Failed to process image for ${p.fullName}:`, e);
            photoColumnValue = 'Error processing image';
          }
        } else {
          photoColumnValue = p.photoUrl;
        }
      }
      
      const personExportData: {[key: string]: any} = {
        fullName: p.fullName || '',
        phone: p.phone,
        photoUrl: photoColumnValue,
        age: p.age,
        stayingWith: p.stayingWith,
        occupation: p.occupation,
        organisation: p.organisation,
        rentDetails: p.rentDetails,
        nativePlace: p.nativePlace,
        sgRating: p.sgRating || 0,
        contactSource: p.contactSource,
        chantingStatus: p.chantingStatus,
        fromOtherCamp: p.fromOtherCamp,
        enablerInTouchWith: p.enablerInTouchWith,
        folkGuide: p.folkGuide,
        generalRemarks: p.generalRemarks || '',
        lastCallRemark: p.lastCallRemark || '',
        lastCallStatus: p.lastCallStatus || '',
        lastCallAt: safeDate(p.lastCallAt),
      };

      customFields.forEach(field => {
        personExportData[field.label] = p.customData?.[field.id] ?? '';
      });

      exportData.push(personExportData);
    }

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Contacts");
    
    const excelBuffer = write(workbook, { bookType: "xlsx", type: "array" });
    zip.file("contacts.xlsx", excelBuffer);

    try {
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = "contacts_export.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Export Successful',
        description: `Exported ${filteredAndSortedPeople.length} contacts in contacts_export.zip.`,
      });
      await logAudit('Export Contacts', `Exported ${filteredAndSortedPeople.length} contacts.`, { id: appUser.id, name: appUser.name, role: appUser.role });

    } catch (err) {
      console.error("Failed to generate zip file:", err);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not create the zip file.',
      });
    } finally {
      setIsExporting(false);
    }
  }, [filteredAndSortedPeople, toast, appUser, customFields]);

  const handleExportForGoogle = React.useCallback(() => {
    const peopleToExport = Array.from(selectedIds)
      .map(id => allFetchedPeople.find(p => p.id === id))
      .filter(p => p !== undefined) as Person[];

    if (peopleToExport.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Selection',
        description: 'Please select contacts to export.',
      });
      return;
    }

    setIsExporting(true);

    let vcfString = '';
    
    peopleToExport.forEach(p => {
      const nameParts = p.fullName.trim().split(/\s+/);
      const givenName = nameParts[0] || '';
      const familyName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const personGroups = groups.filter(g => g.peopleIds.includes(p.id));
      
      const contactName = personGroups.length > 0 
        ? `${p.fullName}_${personGroups[0].name.replace(/\s+/g, '')}` 
        : p.fullName;
      
      const notes = [
        `Occupation: ${p.occupation || 'N/A'}`,
        `Organisation: ${p.organisation || 'N/A'}`,
        `Source: ${p.contactSource || 'N/A'}`,
        `Rating: ${p.sgRating || '0'}/5`,
      ].join('\\n');

      vcfString += `BEGIN:VCARD\n`;
      vcfString += `VERSION:3.0\n`;
      vcfString += `FN:${contactName}\n`;
      vcfString += `N:${familyName};${givenName};;;\n`;
      vcfString += `TEL;TYPE=CELL:${p.phone}\n`;
      vcfString += `NOTE:${notes}\n`;
      vcfString += `END:VCARD\n`;
    });

    const blob = new Blob([vcfString], { type: 'text/vcard;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'google_contacts.vcf');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExporting(false);
    toast({
      title: 'Export Successful',
      description: `${peopleToExport.length} contacts exported as a VCF file.`,
    });
  }, [selectedIds, allFetchedPeople, groups, toast]);

  const handleFileImport = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !appUser) return;

    setImportingStatus("Reading file...");

    const userInfo: UserInfo = {
      id: appUser.id,
      name: appUser.name,
      role: appUser.role,
    };
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: "array" });
        const sheetName = workbook.SheetNames.find(name => name === 'Contacts');
        if (!sheetName) {
            throw new Error("Could not find a 'Contacts' sheet in the imported file.");
        }
        const worksheet = workbook.Sheets[sheetName];
        const json = utils.sheet_to_json<any>(worksheet);

        const customFieldMap = new Map(customFields.map(f => [f.label.toLowerCase(), f.id]));
        
        const allNewPeople: Omit<Person, 'id' | 'createdAt'>[] = [];

        for (const row of json) {
            const fullName = String(row.fullName || '').trim();
            const phone = String(row.phone || '').replace(/\s+/g, '');

            if (!fullName || !phone) {
                continue;
            }

            const age = parseInt(String(row.age), 10);
            const isValidAge = !isNaN(age) && age >= 16 && age <= 40;
            const stayingWith = ["PG / Hostel", "Flat", "Family"].includes(row.stayingWith) ? row.stayingWith : "Family";
            const rating = parseFloat(String(row.sgRating));
            const isValidRating = !isNaN(rating) && rating >= 0 && rating <= 5;
            const occupation = ["Working", "Student", "Searching for job"].includes(row.occupation) ? row.occupation : "Working";
            const photoUrlValue = String(row.photoUrl || '').trim();
            const isValidPhotoUrl = photoUrlValue.startsWith('http') || photoUrlValue.startsWith('data:image');
            const chantingStatus = parseInt(String(row.chantingStatus), 10);
            const isValidChanting = !isNaN(chantingStatus) && chantingStatus >= 0;

            const rowCustomData: {[key: string]: any} = {};
            for (const header in row) {
                const lowerHeader = header.toLowerCase();
                if (customFieldMap.has(lowerHeader)) {
                    const fieldId = customFieldMap.get(lowerHeader)!;
                    rowCustomData[fieldId] = row[header];
                }
            }
            
            allNewPeople.push({
              fullName,
              phone,
              age: isValidAge ? age : 25,
              stayingWith: stayingWith,
              occupation: occupation as any,
              organisation: String(row.organisation || ""),
              rentDetails: String(row.rentDetails || ""),
              nativePlace: String(row.nativePlace || ""),
              sgRating: isValidRating ? rating : 0,
              contactSource: String(row.contactSource || ""),
              chantingStatus: isValidChanting ? chantingStatus : 0,
              fromOtherCamp: String(row.fromOtherCamp).toLowerCase() === 'yes' || String(row.fromOtherCamp) === 'true',
              enablerInTouchWith: String(row.enablerInTouchWith || '').trim(),
              folkGuide: String(row.folkGuide || '').trim(),
              photoUrl: isValidPhotoUrl ? photoUrlValue : `https://placehold.co/100x100.png`,
              progress: createInitialProgress(),
              customData: rowCustomData,
              generalRemarks: String(row.generalRemarks || ''),
              lastCallRemark: String(row.lastCallRemark || ''),
            });
        }

        if (allNewPeople.length === 0) {
            toast({
                variant: "destructive",
                title: "Import Failed",
                description: "No new valid contacts found in the file.",
            });
            setImportingStatus(false);
            if (event.target) event.target.value = "";
            return;
        }

        for (let i = 0; i < allNewPeople.length; i += 50) {
            const batch = allNewPeople.slice(i, i + 50);
            setImportingStatus(`Importing ${i + batch.length} of ${allNewPeople.length}...`);
            await importPeople(batch, userInfo);
        }

        await fetchPageData();

        toast({
          title: "Import Successful",
          description: `${allNewPeople.length} new contacts added.`,
        });
      } catch (error) {
        console.error("Error importing file:", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: error instanceof Error ? error.message : "There was an error processing your file.",
        });
      } finally {
        if (event.target) {
          event.target.value = "";
        }
        setImportingStatus(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [appUser, toast, customFields, fetchPageData]);

  const handleAddPerson = React.useCallback(() => {
    setEditingPerson(undefined);
    setIsDialogOpen(true);
  }, []);

  const handleEditPerson = React.useCallback((person: Person) => {
    setEditingPerson(person);
    setIsDialogOpen(true);
  }, []);

  const handleDeletePerson = React.useCallback(async (personId: string) => {
    if (!appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      await deletePerson(personId, userInfo);
      toast({
        title: "Person Deleted",
        description: "The person has been removed from your contacts.",
      });
      fetchPageData();
    } catch(error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete person.",
      });
    }
  }, [toast, appUser, fetchPageData]);

  const handleDeleteSelected = React.useCallback(async () => {
    if (!appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      await deletePeople(Array.from(selectedIds), userInfo);
      toast({
        title: "Contacts Deleted",
        description: `${selectedIds.size} contacts have been removed.`,
      });
      setSelectedIds(new Set());
      fetchPageData();
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the selected contacts.",
      });
    }
  }, [selectedIds, toast, appUser, fetchPageData]);


  const handleSavePerson = React.useCallback(async (personData: Omit<Person, "id" | "progress" | "createdAt">) => {
    if (!appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      if (editingPerson) {
        await updatePerson(editingPerson.id, personData, userInfo);
        toast({
          title: "Person Updated",
          description: "The person's details have been saved.",
        });
      } else {
        const newPersonData = {
          ...personData,
          progress: createInitialProgress(),
        };
        await createPerson(newPersonData as Omit<Person, 'id' | 'createdAt'>, userInfo);
        toast({
          title: "Person Added",
          description: "The new person has been added to your contacts.",
        });
      }
      fetchPageData();
    } catch(error) {
      console.error("Failed to save person:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not save person.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      throw error;
    }
  }, [appUser, toast, editingPerson, fetchPageData]);
  
  const handleAddToGroup = React.useCallback(async (groupId: string) => {
    if (selectedIds.size === 0 || !appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      await addPeopleToGroup(groupId, Array.from(selectedIds), userInfo);
      toast({
        title: "Members Added",
        description: `${selectedIds.size} contacts have been added to the group.`,
      });
      setSelectedIds(new Set());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not add contacts to the group.",
      });
    }
  }, [selectedIds, toast, appUser]);

  const handleSaveGroupAndAddMembers = React.useCallback(async (groupData: Omit<Group, "id" | "memberCount" | "peopleIds" | "createdBy">) => {
    if (!appUser) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      const newGroupData: Omit<Group, 'id' | 'createdBy'> = {
        memberCount: 0,
        peopleIds: [],
        ...groupData,
      };
      const newGroup = await createGroup(newGroupData, userInfo);
      
      if (selectedIds.size > 0) {
        await addPeopleToGroup(newGroup.id, Array.from(selectedIds), userInfo);
         toast({
          title: "Group Created & Members Added",
          description: `The group "${newGroup.name}" was created and ${selectedIds.size} contacts were added.`,
        });
        setSelectedIds(new Set());
      } else {
         toast({
          title: "Group Created",
          description: `The new group "${newGroup.name}" has been added.`,
        });
      }
      fetchPageData();
      setIsCreateGroupDialogOpen(false);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create or add members to the new group.",
      });
    }
  }, [selectedIds, appUser, toast, fetchPageData]);
  
  const handleAssignCoEnabler = React.useCallback(async (coEnabler: AppUser | null) => {
    if (!appUser || selectedIds.size === 0) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
      await assignCoEnablerToPeople(Array.from(selectedIds), coEnabler, userInfo);
      toast({
        title: coEnabler ? 'Co-Enabler Assigned' : 'Co-Enabler Unassigned',
        description: `${selectedIds.size} contacts have been updated.`,
      });
      await fetchPageData();
      setSelectedIds(new Set());
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not assign co-enabler.",
      });
    }
  }, [selectedIds, toast, fetchPageData, appUser]);

  const handleAssignEnabler = React.useCallback(async (enabler: AppUser) => {
    if (!appUser || selectedIds.size === 0) return;
    const userInfo: UserInfo = { id: appUser.id, name: appUser.name, role: appUser.role };
    try {
        await assignEnablerToPeople(Array.from(selectedIds), enabler, userInfo);
        toast({
            title: 'Enabler Assigned',
            description: `${selectedIds.size} contacts have been assigned to ${enabler.name}.`,
        });
        await fetchPageData();
        setSelectedIds(new Set());
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not assign the enabler." });
    }
  }, [selectedIds, toast, fetchPageData, appUser]);

  const isLoadingAction = !!importingStatus || isExporting;
  const loadingText = typeof importingStatus === 'string' ? importingStatus : (isExporting ? 'Exporting...' : '');
  const isSelectionActive = selectedIds.size > 0;

  const renderContent = () => {
    if (isLoading && allFetchedPeople.length === 0) {
      return (
        <div className="flex min-h-[50vh] w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    
    if (fetchError) {
      return <FirebaseConfigError error={fetchError} />;
    }
    
    return (
      <>
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  className="pl-10 w-full sm:w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
               <FilterPopover filters={filters} setFilters={setFilters} filterableFields={filterableFields} />
               <SortPopover sortDescriptors={sortDescriptors} setSortDescriptors={setSortDescriptors} />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md bg-muted p-1">
              <Button
                variant={view === "card" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setView("card")}
                aria-label="Card View"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "table" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setView("table")}
                aria-label="Table View"
              >
                <List className="h-4 w-4" />
              </Button>
              </div>
            </div>
          </div>

          {isSelectionActive && (
               <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg border">
                  <span className="text-sm font-semibold mr-4">{selectedIds.size} selected</span>
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                          <Users className="mr-2 h-4 w-4" />
                          Add to Group
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          {groups.filter(g => !g.isDynamic).map((group) => (
                          <DropdownMenuItem
                              key={group.id}
                              onSelect={() => handleAddToGroup(group.id)}
                          >
                              {group.name}
                          </DropdownMenuItem>
                          ))}
                          {groups.filter(g => !g.isDynamic).length > 0 && <DropdownMenuSeparator />}
                          <DropdownMenuItem onSelect={() => setIsCreateGroupDialogOpen(true)}>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Create New Group
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>

                  {canAssignUsers && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setIsAssignEnablerDialogOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Assign Enabler
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsAssignCoEnablerDialogOpen(true)}>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Assign Co-Enabler
                      </Button>
                    </>
                  )}

                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                              This will permanently delete the selected {selectedIds.size} contacts. This action cannot be undone.
                          </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
                              Delete
                          </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                   <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIds(new Set())}
                      className="ml-auto"
                  >
                      Deselect All
                  </Button>
              </div>
          )}
        </div>
        
        {view === 'card' ? (
          paginatedPeople.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedPeople.map((person) => {
                  const personGroups = groups.filter(g => g.peopleIds.includes(person.id));
                  return (
                    <PersonCard
                      key={person.id}
                      person={person}
                      isSelected={selectedIds.has(person.id)}
                      onSelectionChange={(id, checked) => {
                        setSelectedIds(prev => {
                          const newSet = new Set(prev);
                          if (checked) newSet.add(id);
                          else newSet.delete(id);
                          return newSet;
                        });
                      }}
                      groups={personGroups}
                      isSelectionActive={isSelectionActive}
                    />
                  )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No contacts found.</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          )
        ) : (
          <PersonTable
            people={paginatedPeople}
            allPeopleCount={filteredAndSortedPeople.length}
            onEdit={handleEditPerson}
            onDelete={handleDeletePerson}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            isSelectionActive={isSelectionActive}
          />
        )}

        {totalPages > 1 && (
            <Pagination className="mt-8">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} tabIndex={currentPage === 1 ? -1 : undefined} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="p-2 text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} tabIndex={currentPage === totalPages ? -1 : undefined} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <PageHeader
              title="FOLK SPIRITUAL GEMS"
              description="Your central hub for managing contacts and activities."
          >
              <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3" disabled={isLoadingAction}>
                                {isLoadingAction ? (
                                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                            ) : (
                                <Upload className="h-4 w-4 sm:mr-2" />
                            )}
                            <span className="hidden sm:inline">{isLoadingAction ? loadingText : 'Import/Export'}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => fileInputRef.current?.click()} disabled={isLoadingAction}>
                              <Upload className="mr-2 h-4 w-4" />
                              Import from Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExport} disabled={isLoadingAction}>
                              <LayoutGrid className="mr-2 h-4 w-4" />
                              Export to Excel/Zip
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportForGoogle} disabled={isExporting || selectedIds.size === 0}>
                              <Contact className="mr-2 h-4 w-4" />
                              Export for Google
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSampleDownload} disabled={isLoadingAction}>
                              Download Sample Excel
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                  <Info className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                              <p className="font-semibold">Import/Export Guide</p>
                              <ul className="list-disc pl-4 mt-2 space-y-1 text-xs">
                                  <li>Use "Download Sample Excel" to get a template with dropdowns for easy assignment.</li>
                                  <li>"Export for Google" creates a CSV of selected contacts to import into Google Contacts.</li>
                                  <li>"Export to Excel/Zip" is best for full backups, including photos.</li>
                                  <li>Import can handle up to 10,000 contacts at once.</li>
                              </ul>
                          </TooltipContent>
                        </Tooltip>
                    </div>
                  </TooltipProvider>

                  <Button size="sm" onClick={handleAddPerson} className="h-9 w-9 sm:h-9 sm:w-auto sm:px-3" disabled={isLoadingAction}>
                  <PlusCircle className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Person</span>
                  </Button>
              </div>
          </PageHeader>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 sm:pt-0">
            {renderContent()}
          </main>
      </div>
      <CreateUpdatePersonDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        onSave={handleSavePerson}
        person={editingPerson}
        allPeople={allFetchedPeople}
      />
      <CreateUpdateGroupDialog
          isOpen={isCreateGroupDialogOpen}
          setIsOpen={setIsCreateGroupDialogOpen}
          onSave={handleSaveGroupAndAddMembers}
      />
      <AssignCoEnablerDialog
        isOpen={isAssignCoEnablerDialogOpen}
        setIsOpen={setIsAssignCoEnablerDialogOpen}
        onSave={handleAssignCoEnabler}
        peopleCount={selectedIds.size}
      />
       <AssignEnablerDialog
        isOpen={isAssignEnablerDialogOpen}
        setIsOpen={setIsAssignEnablerDialogOpen}
        onSave={handleAssignEnabler}
        peopleCount={selectedIds.size}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".xlsx, .xls, .csv"
      />
    </div>
  );
}
