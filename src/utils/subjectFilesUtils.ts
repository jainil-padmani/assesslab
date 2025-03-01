
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";

export const fetchSubjectFiles = async (subjectId: string): Promise<SubjectFile[]> => {
  try {
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('files')
      .list();

    if (storageError) throw storageError;

    const filesMap = new Map<string, SubjectFile>();
    
    if (storageData && subjectId) {
      storageData.forEach(file => {
        const parts = file.name.split('_');
        if (parts.length >= 3 && parts[0] === subjectId) {
          const topic = parts[1];
          const fileType = parts[2].split('.')[0];
          const groupKey = `${subjectId}_${topic}`;
          
          const { data: { publicUrl } } = supabase
            .storage
            .from('files')
            .getPublicUrl(file.name);
          
          if (!filesMap.has(groupKey)) {
            filesMap.set(groupKey, {
              id: groupKey,
              subject_id: subjectId,
              topic: topic,
              question_paper_url: fileType === 'questionPaper' ? publicUrl : '',
              answer_key_url: fileType === 'answerKey' ? publicUrl : '',
              created_at: file.created_at || new Date().toISOString()
            });
          } else {
            const existingFile = filesMap.get(groupKey)!;
            if (fileType === 'questionPaper') {
              existingFile.question_paper_url = publicUrl;
            } else if (fileType === 'answerKey') {
              existingFile.answer_key_url = publicUrl;
            }
            filesMap.set(groupKey, existingFile);
          }
        }
      });
    }
    
    const files = Array.from(filesMap.values()).filter(
      file => file.question_paper_url && file.answer_key_url
    );
    
    return files;
  } catch (error: any) {
    console.error('Error fetching subject files:', error);
    toast.error('Failed to fetch subject files');
    return [];
  }
};
