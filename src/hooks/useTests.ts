
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  } = useQuery({
    queryKey: ['test-metrics'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('tests')
          .select('status, count(*)')
          .group('status');
        
        if (error) throw error;
        return data;
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
