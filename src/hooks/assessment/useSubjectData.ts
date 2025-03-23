
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/dashboard";
import { toast } from "sonner";

export function useSubjectData() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to view subjects");
      }
      
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      
      if (error) {
        toast.error("Failed to load subjects");
        throw error;
      }
      
      return data as Subject[];
    }
  });
}
