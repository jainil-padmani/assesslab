
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Brain,
  CheckCircle,
  BarChart3,
  LogOut,
  Settings,
  User,
  Book,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const links = [
  {
    title: "Generate Questions",
    icon: BookOpen,
    href: "/dashboard/generate",
  },
  {
    title: "Analysis",
    icon: Brain,
    href: "/dashboard/analysis",
  },
  {
    title: "Auto Check",
    icon: CheckCircle,
    href: "/dashboard/check",
  },
  {
    title: "Performance",
    icon: BarChart3,
    href: "/dashboard/performance",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
];

interface DashboardNavProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DashboardNav({ className, ...props }: DashboardNavProps) {
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className={cn("relative", className)} {...props}>
      <ScrollArea className="h-[calc(100vh-64px)] pb-10">
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <div className="space-y-1">
              <h2 className="mb-4 px-4 text-xl font-semibold">Dashboard</h2>
              <nav className="space-y-2">
                {links.map((link) => (
                  <NavLink
                    key={link.href}
                    to={link.href}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                        isActive ? "bg-accent text-accent-foreground" : "transparent"
                      )
                    }
                  >
                    <link.icon className="mr-2 h-4 w-4" />
                    <span>{link.title}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>
        <div className="px-3 py-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
