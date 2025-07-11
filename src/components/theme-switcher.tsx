
'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export function ThemeSwitcher() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
        <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 md:h-8 md:w-8 text-muted-foreground hover:text-foreground">
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Theme</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
                <Laptop className="mr-2 h-4 w-4" />
                System
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
