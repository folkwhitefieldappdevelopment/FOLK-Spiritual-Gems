'use client';

import * as React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { TableRow, TableCell } from "@/components/ui/table";

export function PersonCardSkeleton() {
  return (
    <Card className="flex flex-col h-full rounded-lg overflow-hidden border-none shadow-sm bg-card">
      <div className="p-4 pt-8 flex flex-col items-center">
        <Skeleton className="h-24 w-24 rounded-full mb-4" />
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="w-full space-y-3 px-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </Card>
  );
}

export function PersonTableRowSkeleton({ 
  hasSelection = true, 
  showEnabler = false, 
  showCoEnabler = false 
}: { 
  hasSelection?: boolean; 
  showEnabler?: boolean; 
  showCoEnabler?: boolean;
} = {}) {
  return (
    <TableRow>
      {hasSelection && (
        <TableCell className="w-[50px] sm:w-[80px] px-2 sm:px-4">
          <div className="flex items-center gap-1 sm:gap-2">
              <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-md" />
              <Skeleton className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </TableCell>
      )}
      <TableCell className="w-[30px] px-1 sm:px-2">
        <Skeleton className="h-4 w-4 mx-auto" />
      </TableCell>
      <TableCell className="w-[120px] sm:min-w-[180px] px-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Skeleton className="h-7 w-7 sm:h-10 sm:w-10 rounded-full shrink-0" />
          <div className="space-y-1 sm:space-y-2 flex-1 overflow-hidden">
            <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
            <Skeleton className="h-2.5 sm:h-3 w-16 sm:w-20" />
          </div>
        </div>
      </TableCell>
      <TableCell className="px-2 sm:px-4">
        <Skeleton className="h-5 w-16 sm:w-20 rounded-full" />
      </TableCell>
      {showEnabler && (
        <TableCell className="px-2 sm:px-4">
          <Skeleton className="h-4 w-20 sm:w-24" />
        </TableCell>
      )}
      {showCoEnabler && (
        <TableCell className="px-2 sm:px-4">
          <Skeleton className="h-4 w-20 sm:w-24" />
        </TableCell>
      )}
      <TableCell className="px-4">
        <Skeleton className="h-4 w-16 sm:w-24" />
      </TableCell>
      <TableCell className="px-4">
        <Skeleton className="h-4 w-16 sm:w-20" />
      </TableCell>
      <TableCell className="text-right px-2 sm:px-4">
        <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 ml-auto rounded-md" />
      </TableCell>
    </TableRow>
  );
}

export function GroupCardSkeleton() {
  return (
    <Card className="flex flex-col h-full bg-card overflow-hidden border-primary/10">
      <Skeleton className="h-32 w-full rounded-none" />
      <CardHeader className="pt-4 px-4 pb-2">
        <div className="flex items-start justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-2/3 mt-1" />
      </CardHeader>
      <CardFooter className="flex justify-between items-center px-4 pb-4 pt-0 mt-auto">
        <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardFooter>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-4 sm:p-0">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4 border-l-4 border-l-muted">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-8 w-12" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-[400px] flex flex-col p-6 space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <div className="flex-1 space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
        </Card>
        <Card className="lg:col-span-1 h-[400px] flex flex-col p-6 space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <div className="flex-1 flex items-center justify-center">
                <Skeleton className="h-48 w-48 rounded-full" />
            </div>
        </Card>
        <Card className="lg:col-span-1 h-[400px] flex flex-col p-6 space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <div className="flex-1 space-y-4 mt-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </Card>
      </div>
    </div>
  );
}