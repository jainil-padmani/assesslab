
import { DashboardNav } from "@/components/DashboardNav";
import { Outlet, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export default function DashboardLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/dashboard/generate" className="text-gray-600 hover:text-accent">
                  Generate
                </Link>
                <Link to="/dashboard/analysis" className="text-gray-600 hover:text-accent">
                  Analysis
                </Link>
                <Link to="/dashboard/check" className="text-gray-600 hover:text-accent">
                  Check
                </Link>
                <Link to="/dashboard/performance" className="text-gray-600 hover:text-accent">
                  Performance
                </Link>
                <Link to="/dashboard/settings" className="text-gray-600 hover:text-accent">
                  Settings
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
        {/* Sidebar for mobile */}
        <aside className="lg:hidden">
          <DashboardNav className="w-64" />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
