
'use client';

import * as React from 'react';
import type { Person } from '@/lib/types';
import { getPeople } from '@/services/people-service';
import { useToast } from '@/hooks/use-toast';
import { subWeeks, startOfWeek, isAfter, format } from 'date-fns';
import { Users, UserPlus, Briefcase, Loader2 } from 'lucide-react';
import { configError } from '@/lib/firebase';
import { FirebaseConfigError } from '@/components/firebase-config-error';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Line, LineChart, Tooltip, Legend } from 'recharts';

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function DashboardPage() {
  const { toast } = useToast();
  const [people, setPeople] = React.useState<Person[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [firebaseError, setFirebaseError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (configError) {
      setFirebaseError(configError);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const peopleData = await getPeople();
        setPeople(peopleData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load dashboard data.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);
  
  const safeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) return d;
    } catch {
      // ignore
    }
    return null;
  }

  const { totalContacts, newThisWeek, contactsByEnabler, newContactsByWeek, contactsByChantingStatus, contactsByOccupation } = React.useMemo(() => {
    if (!people.length) {
      return { totalContacts: 0, newThisWeek: 0, contactsByEnabler: [], newContactsByWeek: [], contactsByChantingStatus: [], contactsByOccupation: [] };
    }
    
    // Total & New This Week
    const now = new Date();
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
    const newThisWeekCount = people.filter(p => {
        const createdAt = safeDate(p.createdAt);
        return createdAt && isAfter(createdAt, startOfThisWeek);
    }).length;

    // Contacts by Enabler
    const enablerMap = new Map<string, number>();
    people.forEach(p => {
        const enabler = p.enablerInTouchWith || 'Unassigned';
        enablerMap.set(enabler, (enablerMap.get(enabler) || 0) + 1);
    });
    const enablerData = Array.from(enablerMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    // New Contacts per Week (last 12 weeks)
    const weekLabels = Array.from({ length: 12 }).map((_, i) => {
        const d = subWeeks(now, 11 - i);
        return `W${i+1}: ${format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM d')}`;
    });
    const weeklyData = Array(12).fill(0);

    people.forEach(p => {
        const createdAt = safeDate(p.createdAt);
        if (createdAt && isAfter(createdAt, subWeeks(now, 12))) {
            for (let i = 0; i < 12; i++) {
                const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
                const weekEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 1 });
                if (createdAt >= weekStart && createdAt < weekEnd) {
                    weeklyData[11-i]++;
                    break;
                }
            }
        }
    });

    const newContactsByWeekData = weekLabels.map((label, i) => ({ name: label, newContacts: weeklyData[i] }));
    
    // Contacts by Chanting Status
    const chantingMap = new Map<string, number>();
    people.forEach(p => {
      const status = p.chantingStatus || 'Not specified';
      chantingMap.set(status, (chantingMap.get(status) || 0) + 1);
    });
    const chantingData = Array.from(chantingMap.entries()).map(([name, value]) => ({ name, value }));

    // Contacts by Occupation Status
    const occupationMap = new Map<string, number>();
    people.forEach(p => {
      const status = p.occupation || 'Not specified';
      occupationMap.set(status, (occupationMap.get(status) || 0) + 1);
    });
    const occupationData = Array.from(occupationMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    return { 
      totalContacts: people.length,
      newThisWeek: newThisWeekCount,
      contactsByEnabler: enablerData,
      newContactsByWeek: newContactsByWeekData,
      contactsByChantingStatus: chantingData,
      contactsByOccupation: occupationData
    };
  }, [people]);
  
  if (firebaseError) {
    return <FirebaseConfigError error={firebaseError} />;
  }
  
  const renderContent = () => {
     if (isLoading) {
      return (
        <div className="flex min-h-[50vh] w-full items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    
    return (
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalContacts}</div>
                <p className="text-xs text-muted-foreground">All contacts in the system</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New This Week</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{newThisWeek}</div>
                <p className="text-xs text-muted-foreground">New contacts added since Monday</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enablers</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{contactsByEnabler.length}</div>
                <p className="text-xs text-muted-foreground">Total enablers with assigned contacts</p>
            </CardContent>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>New Contacts Trend</CardTitle>
            <CardDescription>New contacts added each week for the past 12 weeks.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={{}} className="h-[250px] w-full">
                <LineChart data={newContactsByWeek} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="newContacts" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Contacts by Enabler</CardTitle>
                <CardDescription>Distribution of contacts among enablers.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[300px] w-full">
                <BarChart data={contactsByEnabler} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="value" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={4}>
                    {contactsByEnabler.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>By Chanting Status</CardTitle>
                <CardDescription>Breakdown of contacts' chanting habits.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[300px] w-full">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Legend content={<ChartLegendContent />} />
                  <Pie data={contactsByChantingStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {contactsByChantingStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>By Occupation Status</CardTitle>
            <CardDescription>
              Breakdown of contacts by their current occupation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
               <BarChart data={contactsByOccupation} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="value" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={4}>
                    {contactsByOccupation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex flex-1 flex-col bg-background">
        <PageHeader
          title="Dashboard"
          description="An overview of your contacts and their progress."
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
