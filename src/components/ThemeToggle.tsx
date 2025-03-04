
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ThemeToggleProps {
  variant?: "button" | "radiogroup";
}

export function ThemeToggle({ variant = "button" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (variant === "radiogroup") {
    return (
      <RadioGroup
        defaultValue={theme}
        onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
        className="grid grid-cols-3 gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="light" id="light" />
          <Label htmlFor="light" className="flex items-center gap-2">
            <Sun className="h-4 w-4" /> Light
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="dark" id="dark" />
          <Label htmlFor="dark" className="flex items-center gap-2">
            <Moon className="h-4 w-4" /> Dark
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="system" id="system" />
          <Label htmlFor="system">System</Label>
        </div>
      </RadioGroup>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
