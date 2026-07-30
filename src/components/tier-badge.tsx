'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FollowUpTier } from '@/services/follow-up-service';

export function TierBadge({ tier, className }: { tier: FollowUpTier; className?: string }) {
    switch (tier) {
        case 'never': 
            return <Badge className={cn("bg-blue-500/10 text-blue-500 border-none font-black text-[8px] uppercase px-2 h-5 whitespace-nowrap", className)}>Never Contacted</Badge>;
        case 'overdue': 
            return <Badge className={cn("bg-red-500/10 text-red-500 border-none font-black text-[8px] uppercase px-2 h-5 whitespace-nowrap", className)}>Overdue Callback</Badge>;
        case 'stale': 
            return <Badge className={cn("bg-orange-500/10 text-orange-500 border-none font-black text-[8px] uppercase px-2 h-5 whitespace-nowrap", className)}>SLA Stale</Badge>;
        default: 
            return null;
    }
}
