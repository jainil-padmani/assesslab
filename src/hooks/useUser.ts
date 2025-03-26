
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUser() {
  const { 
    data: user,
    isLoading,
    error
  } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
      } catch (error: any) {
        console.error('Error fetching user:', error);
        toast.error(`Failed to load user profile: ${error.message}`);
        return null;
      }
    }
  });

  return {
    user,
    isLoading,
    error
  };
}
