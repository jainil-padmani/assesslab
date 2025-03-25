
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from "@/components/ui/card";
import { PaperEvaluation } from "@/hooks/useEvaluations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Student } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  ChevronRight, 
  BarChart3, 
  Users, 
  Award, 
  Eye,
  Download
} from "lucide-react";

interface EvaluationResultsCardProps {
  evaluations?: PaperEvaluation[];
  classStudents: Student[];
  selectedTest: string;
  refetchEvaluations: () => void;
}

export function EvaluationResultsCard({ 
  evaluations,
  classStudents,
  selectedTest,
  refetchEvaluations
}: EvaluationResultsCardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [zoomLevel, setZoomLevel] = useState(100);
  const navigate = useNavigate();

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const viewEvaluationDetails = (studentId: string) => {
    navigate(`/dashboard/tests/detail/${selectedTest}?student=${studentId}`);
  };

  if (!evaluations || evaluations.length === 0) {
    return null;
  }

  // Get completed evaluations
  const completedEvaluations = evaluations.filter(e => e.status === 'completed');
  
  if (completedEvaluations.length === 0) {
    return null;
  }

  // Calculate stats
  const averagePercentage = completedEvaluations.length > 0 
    ? Math.round(completedEvaluations.reduce((acc, curr) => {
        const summary = curr.evaluation_data?.summary;
        const percent = summary?.percentage || 0;
        return acc + percent;
      }, 0) / completedEvaluations.length)
    : 0;
  
  const highestScore = completedEvaluations.length > 0
    ? Math.max(...completedEvaluations.map(e => e.evaluation_data?.summary?.percentage || 0))
    : 0;

  const lowestScore = completedEvaluations.length > 0
    ? Math.min(...completedEvaluations.map(e => e.evaluation_data?.summary?.percentage || 0))
    : 0;

  // Group evaluations by score ranges
  const scoreRanges = {
    excellent: completedEvaluations.filter(e => (e.evaluation_data?.summary?.percentage || 0) >= 80).length,
    good: completedEvaluations.filter(e => {
      const score = e.evaluation_data?.summary?.percentage || 0;
      return score >= 60 && score < 80;
    }).length,
    average: completedEvaluations.filter(e => {
      const score = e.evaluation_data?.summary?.percentage || 0;
      return score >= 40 && score < 60;
    }).length,
    poor: completedEvaluations.filter(e => (e.evaluation_data?.summary?.percentage || 0) < 40).length
  };

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-xl font-semibold">Evaluation Results</CardTitle>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResetZoom}
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="text-xs">{zoomLevel}%</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-slate-200 dark:border-slate-800 px-6">
            <TabsList className="bg-transparent h-12">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 text-sm"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 text-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="overview" className="m-0 p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-4">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Total Students</div>
                    <div className="text-2xl font-bold">{classStudents.length}</div>
                  </div>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center">
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mr-4">
                    <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Evaluated</div>
                    <div className="text-2xl font-bold">{completedEvaluations.length}</div>
                  </div>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg mr-4">
                    <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Average Score</div>
                    <div className="text-2xl font-bold">{averagePercentage}%</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-medium mb-4">Score Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                    <div className="text-green-600 dark:text-green-400 font-medium text-sm">Excellent (80-100%)</div>
                    <div className="text-xl font-bold">{scoreRanges.excellent}</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    <div className="text-blue-600 dark:text-blue-400 font-medium text-sm">Good (60-79%)</div>
                    <div className="text-xl font-bold">{scoreRanges.good}</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                    <div className="text-yellow-600 dark:text-yellow-400 font-medium text-sm">Average (40-59%)</div>
                    <div className="text-xl font-bold">{scoreRanges.average}</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                    <div className="text-red-600 dark:text-red-400 font-medium text-sm">Needs Help (&lt;40%)</div>
                    <div className="text-xl font-bold">{scoreRanges.poor}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-medium mb-4">Students Performance</h3>
                <div className="space-y-3">
                  {completedEvaluations.map(evaluation => {
                    const student = classStudents.find(s => s.id === evaluation.student_id);
                    const percentage = evaluation.evaluation_data?.summary?.percentage || 0;
                    
                    let scoreColor = 'text-red-600 dark:text-red-400';
                    if (percentage >= 80) {
                      scoreColor = 'text-green-600 dark:text-green-400';
                    } else if (percentage >= 60) {
                      scoreColor = 'text-blue-600 dark:text-blue-400';
                    } else if (percentage >= 40) {
                      scoreColor = 'text-yellow-600 dark:text-yellow-400';
                    }
                    
                    return (
                      <div 
                        key={evaluation.id} 
                        className="flex items-center justify-between p-3 bg-white dark:bg-black/20 rounded-lg shadow-sm hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {student?.name.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium">{student?.name || 'Unknown Student'}</div>
                            <div className="text-xs text-muted-foreground">ID: {student?.roll_number || 'N/A'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-lg font-bold ${scoreColor}`}>
                            {percentage}%
                          </div>
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={() => viewEvaluationDetails(evaluation.student_id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">View</span>
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="m-0 p-6">
            <div className="space-y-4 py-8 text-center">
              <div className="text-muted-foreground space-y-2">
                <FileText className="h-16 w-16 mx-auto opacity-30" />
                <p className="text-lg">Select a student from the overview tab to view detailed evaluation</p>
                <p className="text-sm">You can see question-by-question analysis and feedback</p>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('overview')}
                  className="mt-4"
                >
                  Go to Overview
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
