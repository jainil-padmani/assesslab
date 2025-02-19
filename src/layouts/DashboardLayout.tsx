
import { DashboardNav } from "@/components/DashboardNav";
import { Outlet, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth } from "@/integrations/firebase/config";
import { onAuthStateChanged } from "firebase/auth";

export default function DashboardLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    return () => unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-gray-100/40 lg:block">
        <DashboardNav />
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
