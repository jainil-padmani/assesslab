
import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateTimePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({ 
  value, 
  onChange, 
  placeholder = "Select date and time", 
  disabled = false 
}: DateTimePickerProps) {
  const [date, setDate] = useState<Date | undefined>(value || undefined);
  const [time, setTime] = useState<string>(
    value ? format(value, 'HH:mm') : '00:00'
  );
  
  // Update the combined date and time when either changes
  useEffect(() => {
    if (date) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      onChange?.(newDate);
    } else {
      onChange?.(null);
    }
  }, [date, time, onChange]);
  
  // Update internal state when value changes externally
  useEffect(() => {
    if (value) {
      setDate(value);
      setTime(format(value, 'HH:mm'));
    } else {
      setDate(undefined);
      setTime('00:00');
    }
  }, [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP HH:mm') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 space-y-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
        <div className="space-y-2">
          <Label htmlFor="time" className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Time
          </Label>
          <Input 
            id="time"
            type="time" 
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
