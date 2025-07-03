
'use client';

import * as React from 'react';
import { Upload, FileQuestion } from 'lucide-react';
import { read, utils } from 'xlsx';
import { useToast } from '@/hooks/use-toast';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type AnalysisResult = {
  enabler: string;
  totalContacts: number;
  callsMade: number;
  sgCount: number;
  manglaArtiCount: number;
  frpCount: number;
};

export default function CallAnalyzerPage() {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [results, setResults] = React.useState<AnalysisResult[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [fileName, setFileName] = React.useState('');

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResults([]);
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = read(data, { type: 'array' });
        
        const analysis: AnalysisResult[] = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const sheetData: any[][] = utils.sheet_to_json(worksheet, { header: 1 });

          if (sheetData.length < 1) continue; // Skip empty sheets

          const headers = sheetData[0].map(h => (h ? String(h).toLowerCase().trim() : ''));
          
          // Find column indices based on header names (case-insensitive)
          const callStatusIndex = headers.indexOf('call status');
          const sgIndex = headers.indexOf('sg');
          const manglaArtiIndex = headers.indexOf('mangla arti');
          const frpIndex = headers.indexOf('frp');
          const contactNameIndex = 0; // Assume first column is always contacts

          const dataRows = sheetData.slice(1);
          const validRows = dataRows.filter(row => Array.isArray(row) && row.length > 0 && row[contactNameIndex] !== undefined && row[contactNameIndex] !== null && String(row[contactNameIndex]).trim() !== '');

          let callsMade = 0;
          let sgCount = 0;
          let manglaArtiCount = 0;
          let frpCount = 0;

          for (const row of validRows) {
            // A count is registered if the relevant column has any non-empty value
            if (callStatusIndex > -1 && row[callStatusIndex] !== undefined && row[callStatusIndex] !== null && String(row[callStatusIndex]).trim() !== '') {
              callsMade++;
            }
            if (sgIndex > -1 && row[sgIndex] !== undefined && row[sgIndex] !== null && String(row[sgIndex]).trim() !== '') {
              sgCount++;
            }
            if (manglaArtiIndex > -1 && row[manglaArtiIndex] !== undefined && row[manglaArtiIndex] !== null && String(row[manglaArtiIndex]).trim() !== '') {
              manglaArtiCount++;
            }
            if (frpIndex > -1 && row[frpIndex] !== undefined && row[frpIndex] !== null && String(row[frpIndex]).trim() !== '') {
              frpCount++;
            }
          }
          
          analysis.push({
            enabler: sheetName,
            totalContacts: validRows.length,
            callsMade,
            sgCount,
            manglaArtiCount,
            frpCount,
          });
        }
        
        setResults(analysis.sort((a, b) => b.callsMade - a.callsMade));

        toast({
          title: 'Analysis Complete',
          description: `Successfully processed ${workbook.SheetNames.length} sheets from ${file.name}.`,
        });

      } catch (error) {
        console.error("Error processing file:", error);
        toast({
          variant: 'destructive',
          title: 'Processing Failed',
          description: 'There was an error reading your Excel file. Please ensure it follows the specified format.',
        });
        setFileName('');
      } finally {
        setIsProcessing(false);
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const totalCalls = results.reduce((sum, item) => sum + item.callsMade, 0);
  const totalSg = results.reduce((sum, item) => sum + item.sgCount, 0);
  const totalManglaArti = results.reduce((sum, item) => sum + item.manglaArtiCount, 0);
  const totalFrp = results.reduce((sum, item) => sum + item.frpCount, 0);
  const totalContacts = results.reduce((sum, item) => sum + item.totalContacts, 0);

  return (
    <>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title="Call Log Analyzer"
            description="Upload an Excel file to analyze call logs and other metrics per enabler."
          >
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
              <Upload className="mr-2 h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Upload Excel Log'}
            </Button>
          </PageHeader>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-4xl space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>How it Works</CardTitle>
                  <CardDescription>
                    Follow this format for your Excel file to get an accurate analysis.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <FileQuestion className="h-4 w-4" />
                    <AlertTitle>Excel File Format</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>Each **sheet** in the Excel file should be named after an **enabler**.</li>
                        <li>The sheet must have a **header row** with column names. The tool will look for specific headers (case-insensitive).</li>
                        <li>The **first column** should always contain the **contact names**.</li>
                        <li>Required column headers for analysis: **Call status**, **SG**, **Mangla Arti**, and **FRP**.</li>
                        <li>To count an item, simply put **any text** (like "Y", "Done", or a date) in the cell for that contact under the correct column header. Empty cells are ignored.</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {fileName && (
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Results</CardTitle>
                    <CardDescription>
                      Showing results for <span className="font-semibold text-primary">{fileName}</span>.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isProcessing ? (
                       <div className="text-center text-muted-foreground p-8">Processing file, please wait...</div>
                    ) : results.length > 0 ? (
                       <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Enabler</TableHead>
                            <TableHead className="text-right">Calls Made</TableHead>
                            <TableHead className="text-right">SG</TableHead>
                            <TableHead className="text-right">Mangla Arti</TableHead>
                            <TableHead className="text-right">FRP</TableHead>
                            <TableHead className="text-right">Total Contacts</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map((result) => (
                            <TableRow key={result.enabler}>
                              <TableCell className="font-medium">{result.enabler}</TableCell>
                              <TableCell className="text-right font-semibold">{result.callsMade}</TableCell>
                              <TableCell className="text-right">{result.sgCount}</TableCell>
                              <TableCell className="text-right">{result.manglaArtiCount}</TableCell>
                              <TableCell className="text-right">{result.frpCount}</TableCell>
                              <TableCell className="text-right">{result.totalContacts}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                       </Table>
                    ) : (
                      <div className="text-center text-muted-foreground p-8">No results to display. Upload a file to begin.</div>
                    )}
                  </CardContent>
                  {results.length > 0 && (
                    <CardFooter className="bg-muted/50 p-4 rounded-b-lg">
                      <div className="w-full grid grid-cols-2 sm:grid-cols-6 gap-2 text-sm font-semibold">
                        <span className="sm:col-span-1 font-bold text-primary">Totals</span>
                        <span className="text-right">Calls: {totalCalls}</span>
                        <span className="text-right">SG: {totalSg}</span>
                        <span className="text-right">MA: {totalManglaArti}</span>
                        <span className="text-right">FRP: {totalFrp}</span>
                        <span className="text-right">Contacts: {totalContacts}</span>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept=".xlsx, .xls"
      />
    </>
  );
}
