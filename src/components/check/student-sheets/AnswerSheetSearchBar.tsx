
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ListFilter } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function AnswerSheetSearchBar({ searchQuery, setSearchQuery }: SearchBarProps) {
  return (
    <div className="px-6 pt-4 pb-2">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-slate-200 dark:border-slate-700"
          />
        </div>
        
        <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 flex gap-2">
          <ListFilter className="h-4 w-4" />
          <span>Filter</span>
        </Button>
      </div>
    </div>
  );
}
