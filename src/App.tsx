
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./layouts/DashboardLayout";
import Generate from "./pages/dashboard/Generate";
import Questions from "./pages/dashboard/Questions";
import Analysis from "./pages/dashboard/Analysis";
import AnalysisResult from "./pages/dashboard/AnalysisResult";
import Check from "./pages/dashboard/Check";
import Performance from "./pages/dashboard/Performance";
import Settings from "./pages/dashboard/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Generate />} />
            <Route path="generate" element={<Generate />} />
            <Route path="questions" element={<Questions />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="analysis-result" element={<AnalysisResult />} />
            <Route path="check" element={<Check />} />
            <Route path="performance" element={<Performance />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
