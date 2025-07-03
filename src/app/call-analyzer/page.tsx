
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
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type CallStatusCounts = { picked: number; notPicked: number };
type SgCounts = { level1: number; level2: number; level3: number };
type FrpCounts = { itpl: number; vfr: number; bfr: number };

type AnalysisResult = {
  enabler: string;
  totalContacts: number;
  callStatus: CallStatusCounts;
  sg: SgCounts;
  frp: FrpCounts;
  manglaArtiCount: number;
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
          
          const callStatusIndex = headers.indexOf('call status');
          const sgIndex = headers.indexOf('sg');
          const manglaArtiIndex = headers.indexOf('mangla arti');
          const frpIndex = headers.indexOf('frp');
          const contactNameIndex = 0;

          const dataRows = sheetData.slice(1);
          const validRows = dataRows.filter(row => Array.isArray(row) && row.length > 0 && row[contactNameIndex] !== undefined && row[contactNameIndex] !== null && String(row[contactNameIndex]).trim() !== '');

          const enablerResult: AnalysisResult = {
            enabler: sheetName,
            totalContacts: validRows.length,
            callStatus: { picked: 0, notPicked: 0 },
            sg: { level1: 0, level2: 0, level3: 0 },
            frp: { itpl: 0, vfr: 0, bfr: 0 },
            manglaArtiCount: 0,
          };

          for (const row of validRows) {
            // Mangla Arti (any non-empty value)
            if (manglaArtiIndex > -1 && row[manglaArtiIndex] !== undefined && row[manglaArtiIndex] !== null && String(row[manglaArtiIndex]).trim() !== '') {
              enablerResult.manglaArtiCount++;
            }

            // Call Status
            if (callStatusIndex > -1) {
              const value = String(row[callStatusIndex] || '').toLowerCase().trim();
              if (value === 'picked call') enablerResult.callStatus.picked++;
              else if (value === 'not picked') enablerResult.callStatus.notPicked++;
            }

            // SG
            if (sgIndex > -1) {
              const value = String(row[sgIndex] || '').toLowerCase().trim();
              if (value === 'level 1') enablerResult.sg.level1++;
              else if (value === 'level 2') enablerResult.sg.level2++;
              else if (value === 'level 3') enablerResult.sg.level3++;
            }

            // FRP
            if (frpIndex > -1) {
              const value = String(row[frpIndex] || '').toLowerCase().trim();
              if (value === 'itpl fr') enablerResult.frp.itpl++;
              else if (value === 'vfr') enablerResult.frp.vfr++;
              else if (value === 'bfr') enablerResult.frp.bfr++;
            }
          }
          
          analysis.push(enablerResult);
        }
        
        setResults(analysis.sort((a, b) => (b.callStatus.picked + b.callStatus.notPicked) - (a.callStatus.picked + a.callStatus.notPicked)));

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

  const totals = React.useMemo(() => {
    if (!results.length) {
      return null;
    }
    return results.reduce((acc, curr) => {
        acc.totalContacts += curr.totalContacts;
        acc.callStatus.picked += curr.callStatus.picked;
        acc.callStatus.notPicked += curr.callStatus.notPicked;
        acc.sg.level1 += curr.sg.level1;
        acc.sg.level2 += curr.sg.level2;
        acc.sg.level3 += curr.sg.level3;
        acc.frp.itpl += curr.frp.itpl;
        acc.frp.vfr += curr.frp.vfr;
        acc.frp.bfr += curr.frp.bfr;
        acc.manglaArtiCount += curr.manglaArtiCount;
        return acc;
    }, {
        totalContacts: 0,
        callStatus: { picked: 0, notPicked: 0 },
        sg: { level1: 0, level2: 0, level3: 0 },
        frp: { itpl: 0, vfr: 0, bfr: 0 },
        manglaArtiCount: 0,
    });
  }, [results]);

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
            <div className="mx-auto max-w-6xl space-y-6">
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
                      <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li>Each **sheet** in the Excel file should be named after an **enabler**.</li>
                        <li>The sheet must have a **header row** with column names. The tool will look for specific headers (case-insensitive).</li>
                        <li>The **first column** should always contain the **contact names**.</li>
                        <li>
                          The tool analyzes these columns:
                          <ul className="list-disc pl-6 mt-1 space-y-1">
                            <li>**Call status**: Counts occurrences of "Picked Call" and "Not Picked".</li>
                            <li>**SG**: Counts occurrences of "Level 1", "Level 2", and "Level 3".</li>
                            <li>**FRP**: Counts occurrences of "ITPL FR", "VFR", and "BFR".</li>
                            <li>**Mangla Arti**: Counts any non-empty cell.</li>
                          </ul>
                        </li>
                        <li>Other columns will be ignored. The text matching for values is case-insensitive.</li>
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
                            <TableHead rowSpan={2} className="align-bottom sticky left-0 bg-card">Enabler</TableHead>
                            <TableHead rowSpan={2} className="align-bottom text-right">Contacts</TableHead>
                            <TableHead colSpan={2} className="text-center border-l">Call Status</TableHead>
                            <TableHead colSpan={3} className="text-center border-l">SG</TableHead>
                            <TableHead colSpan={3} className="text-center border-l">FRP</TableHead>
                            <TableHead rowSpan={2} className="align-bottom text-right border-l">Mangla Arti</TableHead>
                          </TableRow>
                          <TableRow>
                            <TableHead className="text-right border-l">Picked</TableHead>
                            <TableHead className="text-right">Not Picked</TableHead>
                            <TableHead className="text-right border-l">L1</TableHead>
                            <TableHead className="text-right">L2</TableHead>
                            <TableHead className="text-right">L3</TableHead>
                            <TableHead className="text-right border-l">ITPL</TableHead>
                            <TableHead className="text-right">VFR</TableHead>
                            <TableHead className="text-right">BFR</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map((result) => (
                            <TableRow key={result.enabler}>
                              <TableCell className="font-medium sticky left-0 bg-card">{result.enabler}</TableCell>
                              <TableCell className="text-right">{result.totalContacts}</TableCell>
                              <TableCell className="text-right font-semibold border-l">{result.callStatus.picked}</TableCell>
                              <TableCell className="text-right">{result.callStatus.notPicked}</TableCell>
                              <TableCell className="text-right border-l">{result.sg.level1}</TableCell>
                              <TableCell className="text-right">{result.sg.level2}</TableCell>
                              <TableCell className="text-right">{result.sg.level3}</TableCell>
                              <TableCell className="text-right border-l">{result.frp.itpl}</TableCell>
                              <TableCell className="text-right">{result.frp.vfr}</TableCell>
                              <TableCell className="text-right">{result.frp.bfr}</TableCell>
                              <TableCell className="text-right border-l">{result.manglaArtiCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                         {totals && (
                           <TableFooter>
                              <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableCell className="font-bold text-primary sticky left-0 bg-muted/50">Totals</TableCell>
                                <TableCell className="text-right font-bold">{totals.totalContacts}</TableCell>
                                <TableCell className="text-right font-bold border-l">{totals.callStatus.picked}</TableCell>
                                <TableCell className="text-right font-bold">{totals.callStatus.notPicked}</TableCell>
                                <TableCell className="text-right font-bold border-l">{totals.sg.level1}</TableCell>
                                <TableCell className="text-right font-bold">{totals.sg.level2}</TableCell>
                                <TableCell className="text-right font-bold">{totals.sg.level3}</TableCell>
                                <TableCell className="text-right font-bold border-l">{totals.frp.itpl}</TableCell>
                                <TableCell className="text-right font-bold">{totals.frp.vfr}</TableCell>
                                <TableCell className="text-right font-bold">{totals.frp.bfr}</TableCell>
                                <TableCell className="text-right font-bold border-l">{totals.manglaArtiCount}</TableCell>
                              </TableRow>
                           </TableFooter>
                         )}
                       </Table>
                    ) : (
                      <div className="text-center text-muted-foreground p-8">No results to display. Upload a file to begin.</div>
                    )}
                  </CardContent>
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
