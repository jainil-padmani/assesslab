
import { DashboardNav } from "@/components/DashboardNav";
import { Outlet, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function DashboardLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

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

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">
                Teach<span className="text-accent">Lab</span>
              </h1>
            </Link>
            <div className="flex items-center gap-4">
              {userName && (
                <div className="text-sm text-muted-foreground">
                  Welcome, {userName}
                </div>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside 
          className={`fixed md:relative z-30 w-64 border-r bg-background h-[calc(100vh-64px)] transition-all duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'
          }`}
        >
          <DashboardNav onSignOut={handleSignOut} />
        </aside>

        {/* Main content */}
        <main className={cn(
          "flex-1 p-8 transition-all duration-300",
          isSidebarOpen ? "md:ml-0" : "md:ml-16"
        )}>
          <Outlet />
        </main>

        {/* Sidebar toggle button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-background p-2 rounded-r-lg border border-l-0 shadow-md hover:bg-accent z-40"
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
