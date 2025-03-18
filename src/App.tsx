import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import Analysis from "./pages/dashboard/Analysis";
import AnalysisResult from "./pages/dashboard/AnalysisResult";
import AnalysisHistory from "./pages/dashboard/AnalysisHistory";
import Check from "./pages/dashboard/Check";
import Settings from "./pages/dashboard/Settings";
import Students from "./pages/dashboard/Students";
import StudentDetail from "./pages/dashboard/StudentDetail";
import Subjects from "./pages/dashboard/Subjects";
import SubjectDetail from "./pages/dashboard/SubjectDetail";
import FileManagement from "./pages/dashboard/FileManagement";
import Classes from "./pages/dashboard/Classes";
import ClassDetail from "./pages/dashboard/ClassDetail";
import Tests from "./pages/dashboard/Tests";
import SubjectTests from "./pages/dashboard/SubjectTests";
import TestDetail from "./pages/dashboard/TestDetail";
import PaperGeneration from "./pages/dashboard/PaperGeneration";
import PaperCreation from "./pages/dashboard/PaperCreation";
import PaperHistory from "./pages/dashboard/PaperHistory";
import QuestionPaperBuilder from "./pages/dashboard/QuestionPaperBuilder";
import CreatePaperFormat from "./pages/dashboard/CreatePaperFormat";
import GeneratedQuestionsHistory from "./pages/dashboard/GeneratedQuestionsHistory";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="students" element={<Students />} />
                <Route path="students/:id" element={<StudentDetail />} />
                <Route path="subjects" element={<Subjects />} />
                <Route path="subjects/:id" element={<SubjectDetail />} />
                <Route path="classes" element={<Classes />} />
                <Route path="classes/:id" element={<ClassDetail />} />
                <Route path="tests" element={<Tests />} />
                <Route path="tests/subject/:subjectId" element={<SubjectTests />} />
                <Route path="tests/detail/:testId" element={<TestDetail />} />
                <Route path="analysis" element={<Analysis />} />
                <Route path="analysis-result" element={<AnalysisResult />} />
                <Route path="analysis-history" element={<AnalysisHistory />} />
                <Route path="check" element={<Check />} />
                <Route path="settings" element={<Settings />} />
                <Route path="file-management" element={<FileManagement />} />
                <Route path="paper-generation" element={<PaperGeneration />} />
                <Route path="paper-generation/create" element={<PaperCreation />} />
                <Route path="paper-generation/history" element={<PaperHistory />} />
                <Route path="/dashboard/paper-generation/questions-history" element={<GeneratedQuestionsHistory />} />
                {/* Question Paper Builder routes */}
                <Route path="question-paper-builder" element={<QuestionPaperBuilder />} />
                <Route path="question-paper-builder/create" element={<CreatePaperFormat />} />
                <Route path="question-paper-builder/edit/:id" element={<CreatePaperFormat />} />
                <Route path="question-paper-builder/history" element={<PaperHistory />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
