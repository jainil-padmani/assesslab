
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  School,
  BookOpen,
  FileText,
  ClipboardList,
  Brain,
  CheckCircle,
  FileUp,
  BarChart,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import { useNavigate, NavigateFunction } from "react-router-dom";
import { useState, useEffect } from "react";

const navItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Academics",
    icon: GraduationCap,
    submenu: [
      {
        title: "Students",
        icon: Users,
        href: "/dashboard/students",
      },
      {
        title: "Classes",
        icon: School,
        href: "/dashboard/classes",
      },
      {
        title: "Subjects",
        icon: BookOpen,
        href: "/dashboard/subjects",
      },
    ],
  },
  {
    title: "Assessments",
    icon: ClipboardList,
    submenu: [
      {
        title: "Tests",
        icon: FileText,
        href: "/dashboard/tests",
      },
      {
        title: "Question Bank",
        icon: Brain,
        href: "/dashboard/paper-generation",
      },
      {
        title: "Auto Grade",
        icon: CheckCircle,
        href: "/dashboard/check",
      },
    ],
  },
  {
    title: "Resources",
    icon: FileUp,
    href: "/dashboard/file-management",
  },
  {
    title: "Analytics",
    icon: BarChart,
    href: "/dashboard/analysis",
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
  navigate?: NavigateFunction; // Make navigate optional
}

export function DashboardNav({ className, onSignOut, closeMenu, navigate: navigateProp, ...props }: DashboardNavProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  
  // Only call useNavigate if we're inside a Router context
  let routerNavigate: NavigateFunction | undefined;
  try {
    routerNavigate = useNavigate();
  } catch (error) {
    // If useNavigate throws an error, we'll use the prop instead
    routerNavigate = undefined;
  }
  
  // Use the prop if provided, otherwise use the hook result
  const navigate = navigateProp || routerNavigate;
  
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
    if (navigate) {
      navigate(href);
    } else {
      // Fallback to window.location if navigate isn't available
      window.location.href = href;
    }
  };

  const toggleSubmenu = (title: string) => {
    setExpandedMenus(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title) 
        : [...prev, title]
    );
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
              {navItems.map((item) => (
                <div key={item.title} className="space-y-1">
                  {item.submenu ? (
                    <>
                      <div
                        onClick={() => toggleSubmenu(item.title)}
                        className={cn(
                          "group flex items-center justify-between rounded-md px-3 py-2 cursor-pointer text-sm",
                          expandedMenus.includes(item.title) 
                            ? "bg-accent text-accent-foreground" 
                            : "transparent hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <div className="flex items-center">
                          <item.icon className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                          <span>{item.title}</span>
                        </div>
                        {expandedMenus.includes(item.title) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      {expandedMenus.includes(item.title) && (
                        <div className="ml-6 space-y-1 mt-1">
                          {item.submenu.map((subItem) => (
                            <div
                              key={subItem.title}
                              onClick={() => handleNavLinkClick(subItem.href)}
                              className={cn(
                                "group flex items-center rounded-md px-3 cursor-pointer",
                                isMobile ? "text-sm py-2" : "text-sm py-1.5",
                                location.pathname === subItem.href || location.pathname.startsWith(`${subItem.href}/`) 
                                  ? "bg-accent/50 text-accent-foreground" 
                                  : "transparent hover:bg-accent/50 hover:text-accent-foreground"
                              )}
                            >
                              <subItem.icon className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                              <span>{subItem.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      onClick={() => handleNavLinkClick(item.href)}
                      className={cn(
                        "group flex items-center rounded-md px-3 cursor-pointer",
                        isMobile ? "text-sm py-2.5" : "text-sm py-2",
                        location.pathname === item.href || location.pathname.startsWith(`${item.href}/`) 
                          ? "bg-accent text-accent-foreground" 
                          : "transparent hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className={cn("mr-2", isMobile ? "h-4 w-4" : "h-4 w-4")} />
                      <span>{item.title}</span>
                    </div>
                  )}
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
