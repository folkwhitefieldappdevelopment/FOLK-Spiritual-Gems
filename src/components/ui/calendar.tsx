
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-start pt-1 relative items-center mb-4 px-2",
        caption_label: "text-base font-black text-foreground",
        nav: "space-x-1 flex items-center absolute right-2",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 transition-all rounded-full"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse space-y-1",
        head_row: "grid grid-cols-7 mb-2",
        head_cell:
          "text-muted-foreground font-black text-[10px] uppercase tracking-widest text-center flex items-center justify-center",
        row: "grid grid-cols-7 w-full mt-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 h-10 w-full flex items-center justify-center",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:before:bg-primary/10 [&:has(>.day-range-end)]:before:absolute [&:has(>.day-range-end)]:before:inset-y-0 [&:has(>.day-range-end)]:before:left-0 [&:has(>.day-range-end)]:before:right-1/2 " +
              "[&:has(>.day-range-start)]:before:bg-primary/10 [&:has(>.day-range-start)]:before:absolute [&:has(>.day-range-start)]:before:inset-y-0 [&:has(>.day-range-start)]:before:right-0 [&:has(>.day-range-start)]:before:left-1/2"
            : ""
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-bold aria-selected:opacity-100 rounded-full transition-all text-xs sm:text-sm"
        ),
        day_range_start: "day-range-start bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full z-30 shadow-lg",
        day_range_end: "day-range-end bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full z-30 shadow-lg",
        day_range_middle: "day-range-middle aria-selected:bg-primary/10 aria-selected:text-primary rounded-none !important",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground font-black ring-2 ring-accent ring-offset-2",
        day_outside: "day-outside text-muted-foreground opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
