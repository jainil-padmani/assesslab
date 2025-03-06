
import { DashboardNav } from "@/components/DashboardNav";
import { Outlet, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      
      // If switching to desktop from mobile, ensure sidebar is open
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session?.user) {
        // Get user profile to display name
        const { data } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single();
          
        setUserName(data?.name || session.user.email);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        // Get user profile when auth state changes
        const fetchProfile = async () => {
          const { data } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', session.user.id)
            .single();
            
          setUserName(data?.name || session.user.email);
        };
        
        fetchProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const closeMenu = () => {
    setIsSheetOpen(false);
  };

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center">
              <h1 className={cn("font-bold text-primary", isMobile ? "text-lg" : "text-2xl")}>
                Assess<span className="text-accent">Lab</span>
              </h1>
            </Link>
            <div className="flex items-center gap-4">
              {userName && (
                <div className="text-muted-foreground text-sm hidden sm:block">
                  Welcome, {userName}
                </div>
              )}
              
              {/* Mobile menu button - only visible on small screens */}
              {isMobile && (
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-[75%] sm:w-[300px]">
                    <ScrollArea className="h-full">
                      <DashboardNav onSignOut={handleSignOut} closeMenu={closeMenu} />
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}
              
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar - hidden on mobile */}
        <aside 
          className={cn(
            "fixed h-[calc(100vh-64px)] z-30 border-r bg-background transition-all duration-300 hidden md:block",
            isSidebarOpen ? "w-64" : "w-0 md:w-16"
          )}
        >
          <ScrollArea className="h-full">
            <DashboardNav onSignOut={handleSignOut} />
          </ScrollArea>
        </aside>

        {/* Main content - scrollable */}
        <main 
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-300 h-[calc(100vh-64px)] text-sm md:text-base",
            isSidebarOpen ? "md:ml-64" : "ml-0 md:ml-16"
          )}
        >
          <div className="p-4 md:p-8">
            <Outlet />
          </div>
        </main>

        {/* Sidebar toggle button - hidden on mobile */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-background p-2 rounded-r-lg border border-l-0 shadow-md hover:bg-accent z-40 hidden md:block"
        >
          <svg
            className={`h-4 w-4 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
