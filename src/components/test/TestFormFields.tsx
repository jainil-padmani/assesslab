
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type Subject = {
  id: string;
  name: string;
};

export type Class = {
  id: string;
  name: string;
};

interface TestFormFieldsProps {
  name: string;
  setName: (name: string) => void;
  subjectId: string;
  setSubjectId: (id: string) => void;
  classId: string;
  setClassId: (id: string) => void;
  maxMarks: number;
  setMaxMarks: (marks: number) => void;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  subjects: Subject[] | undefined;
  classes: Class[] | undefined;
}

export function TestFormFields({
  name,
  setName,
  subjectId,
  setSubjectId,
  classId,
  setClassId,
  maxMarks,
  setMaxMarks,
  date,
  setDate,
  subjects,
  classes,
}: TestFormFieldsProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">
          Test Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="subject" className="text-right">
          Subject
        </Label>
        <Select value={subjectId} onValueChange={setSubjectId} required>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects?.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="class" className="text-right">
          Class
        </Label>
        <Select value={classId} onValueChange={setClassId} required>
          <SelectTrigger className="col-span-3">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classes?.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="maxMarks" className="text-right">
          Max Marks
        </Label>
        <Input
          id="maxMarks"
          type="number"
          value={maxMarks}
          onChange={(e) => setMaxMarks(Number(e.target.value))}
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="date" className="text-right">
          Test Date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "col-span-3 justify-start text-left font-normal",
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
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
