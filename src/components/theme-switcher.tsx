
'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  
  // To avoid hydration mismatch, we need to make sure the component is mounted on the client
  // before we render the RadioGroup with the correct default value.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null; // or a skeleton loader
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme</CardTitle>
        <CardDescription>
          Select the display theme for the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={theme}
          onValueChange={setTheme}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Label
            htmlFor="light-theme"
            className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
          >
            <RadioGroupItem value="light" id="light-theme" className="sr-only" />
            <Sun className="h-6 w-6 mb-2" />
            Light
          </Label>
          <Label
            htmlFor="dark-theme"
            className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
          >
            <RadioGroupItem value="dark" id="dark-theme" className="sr-only" />
            <Moon className="h-6 w-6 mb-2" />
            Dark
          </Label>
          <Label
            htmlFor="system-theme"
            className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
          >
            <RadioGroupItem value="system" id="system-theme" className="sr-only" />
            <Laptop className="h-6 w-6 mb-2" />
            System
          </Label>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
