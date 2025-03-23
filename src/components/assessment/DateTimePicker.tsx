
import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

export default function DateTimePicker({ date, setDate }: DateTimePickerProps) {
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    if (!timeValue || !date) return;

    const [hours, minutes] = timeValue.split(":").map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours || 0);
    newDate.setMinutes(minutes || 0);
    setDate(newDate);
  };

  const timeValue = date
    ? `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
    : "";

  return (
    <div className="flex flex-col space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                // Preserve time if date already exists
                if (date && newDate) {
                  const hours = date.getHours();
                  const minutes = date.getMinutes();
                  newDate.setHours(hours);
                  newDate.setMinutes(minutes);
                }
                setDate(newDate);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Input
          type="time"
          value={timeValue}
          onChange={handleTimeChange}
          disabled={!date}
          className={!date ? "opacity-50" : ""}
        />
      </div>
      {date && (
        <Button 
          variant="outline" 
          size="sm" 
          className="self-start" 
          onClick={() => setDate(undefined)}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
