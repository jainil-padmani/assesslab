
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Class } from "@/hooks/useClassData";

export function useClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  
  const fetchClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      if (data) setClasses(data);
    } catch (error: any) {
      toast.error('Failed to fetch classes');
      console.error('Error fetching classes:', error);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  return { classes };
}
