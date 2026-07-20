'use client';

import { format } from 'date-fns';
import type { Person, AppUser, FolkStage, Group } from '@/lib/types';
import { folkStages } from '@/lib/types';

/**
 * Definitions for all fields supported in Import/Export
 */
export const BASE_COLUMNS = [
  { header: 'Full Name', key: 'fullName', width: 25 },
  { header: 'Phone', key: 'phone', width: 15 },
  { header: 'Age', key: 'age', width: 10 },
  { header: 'Current Folk Stage', key: 'currentFolkStage', width: 20 },
  { header: 'Location', key: 'location', width: 20 },
  { header: 'Native Place', key: 'nativePlace', width: 20 },
  { header: 'Staying With', key: 'stayingWith', width: 20 },
  { header: 'Occupation', key: 'occupation', width: 20 },
  { header: 'Organisation', key: 'organisation', width: 25 },
  { header: 'Chanting Rounds', key: 'chantingStatus', width: 15 },
  { header: 'SG Rating', key: 'sgRating', width: 15 },
  { header: 'Contact Source', key: 'contactSource', width: 25 },
  { header: 'Relationship Status', key: 'relationshipStatus', width: 20 },
  { header: 'Verified by FG', key: 'verifiedByFg', width: 15 },
  { header: 'Folk ID', key: 'folkId', width: 15 },
  { header: 'Monthly Rent', key: 'rentDetails', width: 15 },
];

/**
 * Normalizes an image by drawing it to a canvas and exporting as a standard JPEG.
 */
async function normalizeImageToJpeg(url: string): Promise<{ buffer: Uint8Array; extension: 'jpeg' } | null> {
  if (!url || typeof window === 'undefined' || typeof window.Image === 'undefined') return null;

  return new Promise((resolve) => {
    const img = new window.Image();
    if (!url.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300; 
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        resolve({ buffer: bytes, extension: 'jpeg' });
      } catch (e) {
        console.warn("Canvas normalization failed:", url, e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Generates and downloads an Excel template with sample data and instructions.
 * Scoped based on the downloading user's role.
 */
export async function downloadImportTemplate(appUser: AppUser) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const isAdmin = appUser.role.includes('Admin');
  const isGuide = appUser.role.includes('Folk Guide') && !isAdmin;
  const isEnabler = appUser.role.includes('Folk Enabler') && !isGuide && !isAdmin;

  const dynamicColumns = [...BASE_COLUMNS];
  if (isAdmin || isGuide) {
    dynamicColumns.push({ header: 'Primary Enabler', key: 'enablerInTouchWith', width: 25 });
  }
  if (isAdmin) {
    dynamicColumns.push({ header: 'Assigned Folk Guide', key: 'folkGuide', width: 30 });
  }
  dynamicColumns.push({ header: 'General Remarks', key: 'generalRemarks', width: 40 });

  // 1. Data Sheet
  const sheet = workbook.addWorksheet('Contacts');
  sheet.columns = dynamicColumns;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };
  
  // Sample Data Row
  sheet.addRow({
    fullName: 'Arjun Sharma',
    phone: '9876543210',
    age: 22,
    currentFolkStage: 'Fresh Lead',
    location: 'Bangalore',
    nativePlace: 'Delhi',
    stayingWith: 'Flat',
    occupation: 'Student',
    organisation: 'IIT Bangalore',
    chantingStatus: 0,
    sgRating: 0,
    contactSource: 'Govinda Temple',
    relationshipStatus: 'Single',
    verifiedByFg: 'No',
    folkId: 'NA',
    rentDetails: 5000,
    enablerInTouchWith: isEnabler ? '' : appUser.name,
    folkGuide: isAdmin ? '' : undefined,
    generalRemarks: 'Interested in Sunday programs.'
  });

  // 2. Instructions Sheet
  const instructions = workbook.addWorksheet('Instructions');
  instructions.columns = [
    { header: 'Field Name', key: 'field', width: 25 },
    { header: 'Required', key: 'required', width: 12 },
    { header: 'Valid Values / Format', key: 'format', width: 80 }
  ];
  instructions.getRow(1).font = { bold: true };
  instructions.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9800' } };

  const instructionRows = [
    { field: 'Full Name', required: 'YES*', format: 'Letters and spaces only. *Mandatory only for NEW contacts.' },
    { field: 'Phone', required: 'YES', format: '10-digit mobile number (e.g. 9876543210). Used to match existing contacts.' },
    { field: 'Age', required: 'YES*', format: 'Number between 16 and 40. *Mandatory for new contacts.' },
    { field: 'Current Folk Stage', required: 'NO', format: `Valid values: ${folkStages.join(', ')}` },
    { field: 'Location', required: 'NO', format: 'Current city or area.' },
    { field: 'Native Place', required: 'NO', format: 'Home town.' },
    { field: 'Staying With', required: 'NO', format: 'PG / Hostel, Flat, Family, Temple Residency, Other' },
    { field: 'Occupation', required: 'NO', format: 'Working, Student, Searching for job, Self Employed, Other' },
    { field: 'Organisation', required: 'NO', format: 'Name of company or college.' },
    { field: 'Chanting Rounds', required: 'NO', format: 'Number from 0 to 16.' },
    { field: 'SG Rating', required: 'NO', format: 'Number from 0 to 5.' },
    { field: 'Contact Source', required: 'NO', format: 'Comma separated list (e.g. Temple, Booth).' },
    { field: 'Relationship Status', required: 'NO', format: 'Single, Married' },
    { field: 'Verified by FG', required: 'NO', format: 'Yes, No' },
    { field: 'Folk ID', required: 'NO', format: 'Internal ID (e.g. NA).' },
    { field: 'Monthly Rent', required: 'NO', format: 'Numeric value (e.g. 5000).' },
  ];

  if (isAdmin || isGuide) {
    instructionRows.push({ 
        field: 'Primary Enabler', 
        required: 'NO', 
        format: isGuide ? 'Name of an enabler reporting to you.' : 'Name of any registered enabler.' 
    });
  }
  if (isAdmin) {
    instructionRows.push({ field: 'Assigned Folk Guide', required: 'NO', format: 'Full name of the Folk Guide.' });
  }

  instructionRows.push({ field: 'General Remarks', required: 'NO', format: 'Any additional notes or summary.' });
  
  instructionRows.push({ 
    field: 'Bulk Update Note', 
    required: '-', 
    format: 'For bulk updates to existing contacts, you only need to include the Phone column plus whichever fields you want to change — leave other columns out entirely, and existing data won\'t be touched.' 
  });

  instructions.addRows(instructionRows);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SG_Import_Template_${format(new Date(), 'yyyyMMdd')}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Parses an imported Excel file using ExcelJS.
 */
export async function parseImportFile(file: File): Promise<Record<string, any>[]> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  
  if (file.name.endsWith('.csv')) {
    await workbook.csv.read(new Buffer(arrayBuffer));
  } else {
    await workbook.xlsx.load(arrayBuffer);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell) => {
    headers.push(String(cell.value).trim());
  });

  // Map headers to field keys
  const headerMap: Record<string, string> = {};
  [...BASE_COLUMNS, { header: 'Primary Enabler', key: 'enablerInTouchWith' }, { header: 'Assigned Folk Guide', key: 'folkGuide' }, { header: 'General Remarks', key: 'generalRemarks' }].forEach(col => {
    const matchedHeader = headers.find(h => h.toLowerCase() === col.header.toLowerCase());
    if (matchedHeader) headerMap[matchedHeader] = col.key;
  });

  const data: Record<string, any>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip headers
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      const key = headerMap[header];
      if (key) {
        const cell = row.getCell(index + 1);
        obj[key] = cell.value;
      }
    });
    data.push(obj);
  });

  return data;
}

/**
 * Exports a list of contacts to an Excel file with full details and embedded photos.
 */
export async function exportContactsToExcel(
  people: Person[], 
  fileName: string, 
  allGroups: Group[] = [],
  onProgress?: (current: number, total: number) => void
) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Contacts');
  
  const exportCols = [
    { header: 'Photo', key: 'photo_placeholder', width: 15 },
    ...BASE_COLUMNS,
    { header: 'Primary Enabler', key: 'enablerInTouchWith', width: 25 },
    { header: 'Assigned Folk Guide', key: 'folkGuide', width: 30 },
    { header: 'General Remarks', key: 'generalRemarks', width: 40 },
    { header: 'Member of Groups', key: 'groups', width: 40 },
    { header: 'Last Call Status', key: 'lastCallStatus', width: 20 },
    { header: 'Last Call At', key: 'lastCallAt', width: 25 },
    { header: 'Last Call Remark', key: 'lastCallRemark', width: 40 },
    { header: 'Full Call History', key: 'fullCallHistory', width: 70 },
    { header: 'Progress Table Data', key: 'fullProgressData', width: 80 },
    { header: 'Attendance History', key: 'attendanceHistory', width: 40 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Photo URL', key: 'photoUrl', width: 50 },
  ];
  
  sheet.columns = exportCols;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  const total = people.length;
  for (let i = 0; i < total; i++) {
    const p = people[i];
    const rowIndex = i + 2;

    if (onProgress) onProgress(i + 1, total);

    const memberOf = allGroups
        .filter(g => (g.peopleIds || []).includes(p.id))
        .map(g => g.name)
        .join(', ');

    const fullHistory = (p.callHistory || [])
        .sort((a, b) => {
            const da = a.calledAt ? new Date(a.calledAt as string).getTime() : 0;
            const db = b.calledAt ? new Date(b.calledAt as string).getTime() : 0;
            return db - da;
        })
        .map(log => {
            const date = log.calledAt ? format(new Date(log.calledAt as string), 'yyyy-MM-dd HH:mm') : 'N/A';
            return `[${date}] STATUS: ${log.status} | REMARK: ${log.remark || 'No remark'} | CALLER: ${log.callerName}${log.event ? ` | EVENT: ${log.event}` : ''}`;
        })
        .join('\n\n');

    const progressLines: string[] = [];
    if (p.progress && Array.isArray(p.progress)) {
        p.progress.forEach(cat => {
            progressLines.push(`=== CATEGORY: ${cat.name} ===`);
            cat.items.forEach(item => {
                const done = item.answers?.l1 || '-';
                const goal = item.levels?.[0] || '-';
                const note = item.answers?.l1_remark || '';
                progressLines.push(`• ${item.question}: Done: ${done} / Goal: ${goal} ${note ? `[Note: ${note}]` : ''}`);
            });
            progressLines.push('');
        });
    }
    const fullProgress = progressLines.join('\n');

    const attHistory = (p.attendanceHistory || [])
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map(att => `${att.groupName} (${att.date})`)
        .join(', ');

    const row = sheet.addRow({
      fullName: p.fullName,
      phone: p.phone,
      age: p.age,
      currentFolkStage: p.currentFolkStage,
      location: p.location,
      nativePlace: p.nativePlace,
      stayingWith: p.stayingWith,
      occupation: p.occupation,
      organisation: p.organisation,
      chantingStatus: p.chantingStatus,
      sgRating: p.sgRating,
      contactSource: Array.isArray(p.contactSource) ? p.contactSource.join(', ') : p.contactSource,
      relationshipStatus: p.relationshipStatus,
      verifiedByFg: p.verifiedByFg,
      folkId: p.folkId,
      rentDetails: p.rentDetails,
      enablerInTouchWith: p.enablerInTouchWith,
      generalRemarks: p.generalRemarks || '',
      photoUrl: p.photoUrl,
      folkGuide: p.folkGuide,
      groups: memberOf,
      lastCallStatus: p.lastCallStatus,
      lastCallAt: p.lastCallAt ? format(new Date(p.lastCallAt), 'yyyy-MM-dd HH:mm:ss') : 'Never',
      lastCallRemark: p.lastCallRemark,
      fullCallHistory: fullHistory,
      fullProgressData: fullProgress,
      attendanceHistory: attHistory,
      createdAt: p.createdAt ? format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm') : 'N/A'
    });

    row.height = 70;
    row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    if (p.photoUrl) {
      const imageData = await normalizeImageToJpeg(p.photoUrl);
      if (imageData) {
        try {
          const imageId = workbook.addImage({
            buffer: imageData.buffer,
            extension: imageData.extension,
          });

          sheet.addImage(imageId, {
            tl: { col: 0.05, row: rowIndex - 0.95 }, 
            ext: { width: 85, height: 85 },
            editAs: 'oneCell'
          });
        } catch (err) {
          console.error("Failed to add image to Excel:", p.fullName, err);
        }
      }
    }
  }

  const wrappedColumns = ['fullCallHistory', 'fullProgressData', 'groups', 'generalRemarks', 'lastCallRemark'];
  wrappedColumns.forEach(key => {
    const col = sheet.getColumn(key);
    if (col) col.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_Full_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
