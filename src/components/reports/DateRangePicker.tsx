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
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-medium bg-white border border-primary/50 hover:border-primary transition-all shadow-sm h-10 text-slate-900",
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
        <PopoverContent className="w-auto p-0 border-white/10 glass-card flex" align="end">
          <div className="flex flex-col border-r border-white/10 p-2 gap-1 bg-white/5">
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
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
