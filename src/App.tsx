
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/dashboard/Dashboard";
import Students from "@/pages/dashboard/Students";
import StudentDetail from "@/pages/dashboard/StudentDetail";
import Subjects from "@/pages/dashboard/Subjects";
import SubjectDetail from "@/pages/dashboard/SubjectDetail";
import FileManagement from "@/pages/dashboard/FileManagement";
import Generate from "@/pages/dashboard/Generate";
import Analysis from "@/pages/dashboard/Analysis";
import AnalysisHistory from "@/pages/dashboard/AnalysisHistory";
import AnalysisResult from "@/pages/dashboard/AnalysisResult";
import Check from "@/pages/dashboard/Check";
import Performance from "@/pages/dashboard/Performance";
import Questions from "@/pages/dashboard/Questions";
import Settings from "@/pages/dashboard/Settings";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/students" element={<Students />} />
        <Route path="/dashboard/students/:id" element={<StudentDetail />} />
        <Route path="/dashboard/subjects" element={<Subjects />} />
        <Route path="/dashboard/subjects/:id" element={<SubjectDetail />} />
        <Route path="/dashboard/upload" element={<FileManagement />} />
        <Route path="/dashboard/generate" element={<Generate />} />
        <Route path="/dashboard/analysis" element={<Analysis />} />
        <Route path="/dashboard/analysis/history" element={<AnalysisHistory />} />
        <Route path="/dashboard/analysis/result" element={<AnalysisResult />} />
        <Route path="/dashboard/check" element={<Check />} />
        <Route path="/dashboard/performance" element={<Performance />} />
        <Route path="/dashboard/questions" element={<Questions />} />
        <Route path="/dashboard/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
