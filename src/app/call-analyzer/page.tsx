
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
          // Using header: 1 gives us an array of arrays, e.g. [['John Doe', 'Y'], ['Jane Smith', '']]
          // This is more robust than assuming header names.
          const sheetData: any[][] = utils.sheet_to_json(worksheet, { header: 1 });
          
          let callsMade = 0;
          // Filter out empty rows before counting total contacts
          const validRows = sheetData.filter(row => Array.isArray(row) && row.length > 0 && (row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== ''));

          for (const row of validRows) {
            // A call is considered made if the second column (index 1) has any value.
            if (row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== '') {
              callsMade++;
            }
          }
          
          analysis.push({
            enabler: sheetName,
            totalContacts: validRows.length,
            callsMade: callsMade,
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
          description: 'There was an error reading your Excel file. Please ensure it is not corrupted.',
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
  const totalContacts = results.reduce((sum, item) => sum + item.totalContacts, 0);

  return (
    <>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col bg-background">
          <PageHeader
            title="Call Log Analyzer"
            description="Upload an Excel file to analyze call logs per enabler."
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
                        <li>Inside each sheet, the **first column (A)** should contain the names of the contacts.</li>
                        <li>The **second column (B)** should be used to mark if a call was made. Any text, date, or number in this column counts as one call. Empty cells are ignored.</li>
                        <li>The tool will count the number of non-empty cells in the second column for each sheet to determine the calls made by that enabler.</li>
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
                            <TableHead>Enabler (Sheet Name)</TableHead>
                            <TableHead className="text-right">Calls Made</TableHead>
                            <TableHead className="text-right">Total Contacts Listed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map((result) => (
                            <TableRow key={result.enabler}>
                              <TableCell className="font-medium">{result.enabler}</TableCell>
                              <TableCell className="text-right font-semibold">{result.callsMade}</TableCell>
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
                      <div className="w-full flex justify-between items-center text-sm font-semibold">
                        <span>Total</span>
                        <div className="flex gap-8">
                           <span className="text-right">Calls: {totalCalls}</span>
                           <span className="text-right">Contacts: {totalContacts}</span>
                        </div>
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
