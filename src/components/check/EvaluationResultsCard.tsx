
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PaperEvaluation } from "@/hooks/useEvaluations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Student } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

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

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  if (!evaluations || evaluations.length === 0) {
    return null;
  }

  // Get completed evaluations
  const completedEvaluations = evaluations.filter(e => e.status === 'completed');
  
  if (completedEvaluations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Evaluation Results</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResetZoom}
            >
              <RotateCw className="h-4 w-4" />
              <span className="ml-1">{zoomLevel}%</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted p-4 rounded-md">
                  <div className="text-sm font-medium text-muted-foreground">Total Students</div>
                  <div className="text-2xl font-bold">{classStudents.length}</div>
                </div>
                <div className="bg-muted p-4 rounded-md">
                  <div className="text-sm font-medium text-muted-foreground">Evaluated</div>
                  <div className="text-2xl font-bold">{completedEvaluations.length}</div>
                </div>
                <div className="bg-muted p-4 rounded-md">
                  <div className="text-sm font-medium text-muted-foreground">Average Score</div>
                  <div className="text-2xl font-bold">
                    {completedEvaluations.length > 0 
                      ? Math.round(completedEvaluations.reduce((acc, curr) => {
                          const summary = curr.evaluation_data?.summary;
                          const percent = summary?.percentage || 0;
                          return acc + percent;
                        }, 0) / completedEvaluations.length) + '%'
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Students Performance</h3>
                <div className="space-y-2">
                  {completedEvaluations.map(evaluation => {
                    const student = classStudents.find(s => s.id === evaluation.student_id);
                    const percentage = evaluation.evaluation_data?.summary?.percentage || 0;
                    
                    return (
                      <div key={evaluation.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div>
                          <div className="font-medium">{student?.name || 'Unknown Student'}</div>
                          <div className="text-sm text-muted-foreground">{student?.roll_number || ''}</div>
                        </div>
                        <div className="flex items-center">
                          <div className={`text-lg font-bold ${
                            percentage >= 70 ? 'text-green-600' : 
                            percentage >= 50 ? 'text-amber-600' : 
                            'text-red-600'
                          }`}>
                            {percentage}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details">
            <div className="space-y-4">
              <div className="text-center text-muted-foreground">
                Select a student to view detailed evaluation
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
