
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (date: string | undefined) => void;
}

export function DateTimePicker({ id, name, value, onChange }: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(value ? new Date(value) : undefined)

  // Handle date selection
  const handleSelect = (newDate: Date | undefined) => {
    setDate(newDate)
    
    if (onChange && newDate) {
      onChange(newDate.toISOString())
    } else if (onChange) {
      onChange(undefined)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP HH:mm") : <span>Pick a date and time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          className="pointer-events-auto"
        />
        <div className="p-3 border-t border-border">
          <Input
            type="time"
            onChange={(e) => {
              if (date && e.target.value) {
                const [hours, minutes] = e.target.value.split(':').map(Number)
                const newDate = new Date(date)
                newDate.setHours(hours, minutes)
                handleSelect(newDate)
              }
            }}
            value={date ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}` : ''}
            className="w-full"
          />
        </div>
        <input type="hidden" name={name} value={date?.toISOString() || ''} />
      </PopoverContent>
    </Popover>
  )
}
