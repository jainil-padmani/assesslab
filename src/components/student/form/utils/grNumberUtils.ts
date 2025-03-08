
import { supabase } from "@/integrations/supabase/client";

export const checkGRNumberExists = async (grNumber: string, studentId?: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  
  const query = supabase
    .from("students")
    .select("id")
    .eq("gr_number", grNumber)
    .eq("user_id", user.id);
    
  if (studentId) {
    query.neq("id", studentId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Error checking GR number:", error);
    return false;
  }
  
  return data.length > 0;
};
