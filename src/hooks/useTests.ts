
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TestMetric {
  status: string;
  count: number;
}

export function useTests() {
  // Fetch all tests
  const { 
    data: tests, 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['tests'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('tests')
          .select('*')
          .order('test_date', { ascending: false });
        
        if (error) throw error;
        return data;
      } catch (error: any) {
        console.error('Error fetching tests:', error);
        toast.error(`Failed to load tests: ${error.message}`);
        return [];
      }
    }
  });

  // Get test metrics (count by status)
  const { 
    data: testMetrics,
    isLoading: isMetricsLoading
  } = useQuery<TestMetric[]>({
    queryKey: ['test-metrics'],
    queryFn: async () => {
      try {
        // First, fetch all tests to calculate metrics client-side
        const { data, error } = await supabase
          .from('tests')
          .select('status');
        
        if (error) throw error;
        
        // Manually count tests by status
        const statusCounts: Record<string, number> = {};
        
        // Count each status
        data.forEach(test => {
          const status = test.status || 'Unknown';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        // Convert to array of TestMetric objects
        const metrics: TestMetric[] = Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count
        }));
        
        return metrics;
      } catch (error: any) {
        console.error('Error fetching test metrics:', error);
        return [];
      }
    }
  });

  return {
    tests,
    testMetrics,
    isLoading: isLoading || isMetricsLoading,
    error,
    refetch
  };
}
