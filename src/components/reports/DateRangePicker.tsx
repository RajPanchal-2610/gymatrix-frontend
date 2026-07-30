import * as React from "react"
import { addDays, format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}

export function DateRangePicker({
  className,
  date,
  setDate,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2 w-full sm:w-auto", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full sm:w-[260px] justify-center sm:justify-start text-left font-medium bg-white border border-primary/50 hover:border-primary transition-all shadow-sm h-10 text-slate-900",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            {date?.from ? (
              date.to ? (
                <>
                  <span>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</span>
                </>
              ) : (
                <span>{format(date.from, "LLL dd, y")}</span>
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] sm:w-auto p-0 border-white/10 glass-card flex flex-col sm:flex-row"
          align="start"
          avoidCollisions={false}
        >
          <div className="flex flex-row sm:flex-col border-b sm:border-b-0 sm:border-r border-white/10 p-2 gap-1 bg-white/5 overflow-x-auto sm:overflow-x-visible scrollbar-none">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start font-normal text-xs"
              onClick={() => setDate({ from: new Date(), to: new Date() })}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start font-normal text-xs"
              onClick={() => setDate({ from: addDays(new Date(), -7), to: new Date() })}
            >
              Last 7 Days
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start font-normal text-xs"
              onClick={() => setDate({ from: addDays(new Date(), -30), to: new Date() })}
            >
              Last 30 Days
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start font-normal text-xs"
              onClick={() => setDate({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}
            >
              This Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start font-normal text-xs"
              onClick={() => setDate({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) })}
            >
              Last Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start font-normal text-xs"
              onClick={() => setDate({ from: startOfYear(new Date()), to: endOfYear(new Date()) })}
            >
              This Year
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start font-normal text-xs"
              onClick={() => setDate({ from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) })}
            >
              Last Year
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start font-normal text-xs"
              onClick={() => setDate({ from: subYears(new Date(), 10), to: new Date() })}
            >
              All Time
            </Button>
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={1}
              className="w-full sm:w-auto p-3"
              classNames={{
                months: "w-full sm:w-auto flex flex-col sm:flex-row sm:space-x-4 sm:space-y-0 space-y-4",
                month: "w-full sm:w-auto space-y-4",
                head_row: "flex w-full sm:w-auto",
                head_cell: "flex-1 sm:flex-none sm:w-9 text-muted-foreground rounded-md font-normal text-[0.8rem] text-center",
                row: "flex w-full sm:w-auto mt-2",
                cell: "flex-1 sm:flex-none sm:w-9 h-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "w-full sm:w-9 h-9 p-0 font-normal aria-selected:opacity-100 inline-flex items-center justify-center rounded-md text-sm hover:bg-accent hover:text-accent-foreground",
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
