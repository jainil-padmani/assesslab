
import { DashboardNav } from "@/components/DashboardNav";
import { Outlet, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Book } from "lucide-react";
import { toast } from "sonner";

export default function DashboardLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
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
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">
                Teach<span className="text-accent">Lab</span>
              </h1>
            </Link>
            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-6">
                <Link to="/dashboard/students" className="flex items-center gap-2 text-gray-600 hover:text-accent">
                  <User className="h-4 w-4" />
                  <span>Students</span>
                </Link>
                <Link to="/dashboard/subjects" className="flex items-center gap-2 text-gray-600 hover:text-accent">
                  <Book className="h-4 w-4" />
                  <span>Subjects</span>
                </Link>
              </nav>
              <Button variant="ghost" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`w-64 border-r bg-white transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <DashboardNav />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>

        {/* Sidebar toggle button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-r-lg border border-l-0 shadow-md hover:bg-gray-50"
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
