
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Clock, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { AnalysisResult } from "@/types/dashboard";

type AnalysisHistory = Omit<Database['public']['Tables']['analysis_history']['Row'], 'analysis'> & {
  analysis: AnalysisResult;
};

const generatePDF = async (item: AnalysisHistory) => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-report', {
      body: { analysis: item.analysis }
    });

    if (error) throw error;

    // Create a report file with the AI-generated content
    const blob = new Blob([data.reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `analysis-report-${format(new Date(), 'yyyy-MM-dd')}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success("Report downloaded successfully");
  } catch (error) {
    console.error('Error generating report:', error);
    toast.error("Failed to generate report");
  }
};

export default function AnalysisHistory() {
  const navigate = useNavigate();

  const { data: historyItems, isLoading } = useQuery({
    queryKey: ['analysis-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as AnalysisHistory[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={() => navigate("/dashboard/analysis")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Analysis
        </Button>
      </div>

      <div className="grid gap-6">
        <h1 className="text-3xl font-bold">Analysis History</h1>
        
        {isLoading ? (
          <p>Loading history...</p>
        ) : !historyItems?.length ? (
          <p className="text-muted-foreground">No analysis history found.</p>
        ) : (
          historyItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => generatePDF(item)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Report
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate('/dashboard/analysis-result', { 
                        state: { 
                          analysis: item.analysis,
                          expectedBloomsTaxonomy: item.analysis.expectedBloomsTaxonomy 
                        } 
                      })}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Analysis
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-2 h-4 w-4" />
                    {format(new Date(item.created_at), 'PPpp')}
                  </div>
                  
                  {item.analysis.expectedBloomsTaxonomy && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium">Expected Bloom's Taxonomy:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(item.analysis.expectedBloomsTaxonomy).map(([level, percentage]) => (
                            <div 
                              key={level}
                              className="flex items-center justify-between p-2 rounded-lg border bg-muted/50"
                            >
                              <span className="text-sm font-medium">
                                {level.charAt(0).toUpperCase() + level.slice(1)}:
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {typeof percentage === 'number' ? `${percentage.toFixed(1)}%` : '0%'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
