
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Brain,
  CheckCircle,
  Settings,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  GraduationCap,
  Notebook,
  FileUp,
  School,
  FileText,
  LayoutTemplate
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

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
    title: "Paper Generation",
    icon: FileText,
    href: "/dashboard/paper-generation",
  },
  {
    title: "Set Question Paper",
    icon: LayoutTemplate,
    href: "/dashboard/question-paper-builder",
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
    title: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
  },
];

interface DashboardNavProps extends React.HTMLAttributes<HTMLDivElement> {
  onSignOut: () => void;
  closeMenu?: () => void;
}

export function DashboardNav({ className, onSignOut, closeMenu, ...props }: DashboardNavProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleNavLinkClick = (href: string) => {
    if (isMobile && closeMenu) {
      closeMenu();
    }
    navigate(href);
  };
  
  return (
    <div className={cn("relative", className)} {...props}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            {isMobile && (
              <div className="flex items-center justify-between mb-6 px-4">
                <h2 className="text-lg font-semibold tracking-tight">Menu</h2>
              </div>
            )}
            {!isMobile && <h2 className="mb-4 px-4 text-xl font-semibold tracking-tight">Menu</h2>}
            <nav className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.href}
                  onClick={() => handleNavLinkClick(link.href)}
                  className={cn(
                    "group flex items-center rounded-md px-3 cursor-pointer",
                    isMobile ? "text-sm py-2.5" : "text-sm py-2",
                    location.pathname === link.href || location.pathname.startsWith(`${link.href}/`) 
                      ? "bg-accent text-accent-foreground" 
                      : "transparent hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <link.icon className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                  <span>{link.title}</span>
                </div>
              ))}
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  isMobile ? "text-sm py-2.5" : "text-sm py-2"
                )}
                onClick={onSignOut}
              >
                <LogOut className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                Sign Out
              </Button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
