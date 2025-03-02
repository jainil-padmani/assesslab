
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Brain,
  CheckCircle,
  BarChart3,
  Settings,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  GraduationCap,
  Notebook,
  FileUp,
  School
} from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Students",
    icon: GraduationCap,
    href: "/dashboard/students",
  },
  {
    title: "Classes",
    icon: School,
    href: "/dashboard/classes",
  },
  {
    title: "Subjects",
    icon: Notebook,
    href: "/dashboard/subjects",
  },
  {
    title: "Tests",
    icon: ClipboardList,
    href: "/dashboard/tests",
  },
  {
    title: "Generate Questions",
    icon: BookOpen,
    href: "/dashboard/generate",
  },
  {
    title: "File Management",
    icon: FileUp,
    href: "/dashboard/file-management",
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

interface DashboardNavProps extends React.HTMLAttributes<HTMLDivElement> {
  onSignOut: () => void;
}

export function DashboardNav({ className, onSignOut, ...props }: DashboardNavProps) {
  return (
    <div className={cn("relative", className)} {...props}>
      <ScrollArea className="h-[calc(100vh-64px)] pb-10">
        <div className="space-y-4 py-4">
          <div className="px-3 py-2">
            <div className="space-y-1">
              <h2 className="mb-4 px-4 text-xl font-semibold">Menu</h2>
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
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={onSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
