
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Database } from "@/types/database";

type AnalysisHistory = Database['public']['Tables']['analysis_history']['Row'];

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
      return data as AnalysisHistory[];
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
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/dashboard/analysis-result', { 
                      state: { analysis: item.analysis } 
                    })}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Analysis
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4" />
                  {format(new Date(item.created_at), 'PPpp')}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
