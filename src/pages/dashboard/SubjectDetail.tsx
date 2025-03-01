
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Subject, Student, BloomsTaxonomy, SubjectFile } from "@/types/dashboard";
import { SubjectInfo } from "@/components/subject/SubjectInfo";
import { BloomsTaxonomy as BloomsTaxonomyComponent } from "@/components/subject/BloomsTaxonomy";
import { PapersManagement } from "@/components/subject/PapersManagement";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [bloomsData, setBloomsData] = useState<BloomsTaxonomy | null>(null);
  const [subjectFiles, setSubjectFiles] = useState<SubjectFile[]>([]);
  const [activeTab, setActiveTab] = useState("info");

  const validateAndTransformBloomsTaxonomy = (data: any): BloomsTaxonomy | null => {
    if (!data || typeof data !== 'object') return null;

    const requiredLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    
    const hasAllLevels = requiredLevels.every(level => 
      typeof data[level] === 'number'
    );

    if (!hasAllLevels) return null;

    return {
      remember: data.remember || 0,
      understand: data.understand || 0,
      apply: data.apply || 0,
      analyze: data.analyze || 0,
      evaluate: data.evaluate || 0,
      create: data.create || 0
    };
  };

  useEffect(() => {
    if (id) {
      fetchSubjectData();
      fetchSubjectFiles();
    }
  }, [id]);

  const fetchSubjectData = async () => {
    try {
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .single();

      if (subjectError) throw subjectError;
      if (subjectData) setSubject(subjectData);

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('name');

      if (studentsError) throw studentsError;
      if (studentsData) setStudents(studentsData);

      const { data: answerKeyData, error: answerKeyError } = await supabase
        .from('answer_keys')
        .select('blooms_taxonomy')
        .eq('subject_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (answerKeyError && answerKeyError.code !== 'PGRST116') {
        throw answerKeyError;
      }

      if (answerKeyData?.blooms_taxonomy) {
        const validatedBloomsData = validateAndTransformBloomsTaxonomy(answerKeyData.blooms_taxonomy);
        if (validatedBloomsData) {
          setBloomsData(validatedBloomsData);
        }
      }
    } catch (error: any) {
      toast.error('Failed to fetch subject data');
      console.error('Error:', error);
    }
  };

  const fetchSubjectFiles = async () => {
    try {
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('files')
        .list();

      if (storageError) throw storageError;

      const filesMap = new Map<string, SubjectFile>();
      
      if (storageData && id) {
        storageData.forEach(file => {
          const parts = file.name.split('_');
          if (parts.length >= 3 && parts[0] === id) {
            const topic = parts[1];
            const fileType = parts[2].split('.')[0];
            const groupKey = `${id}_${topic}`;
            
            const { data: { publicUrl } } = supabase
              .storage
              .from('files')
              .getPublicUrl(file.name);
            
            if (!filesMap.has(groupKey)) {
              filesMap.set(groupKey, {
                id: groupKey,
                subject_id: id,
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
      
      setSubjectFiles(files);
    } catch (error: any) {
      console.error('Error fetching subject files:', error);
      toast.error('Failed to fetch subject files');
    }
  };

  if (!subject) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{subject.name}</h1>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Subject Info</TabsTrigger>
            <TabsTrigger value="papers">Subject Papers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <TabsContent value="info" className="mt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <SubjectInfo 
            subject={subject} 
            fetchSubjectData={fetchSubjectData} 
          />
          <BloomsTaxonomyComponent 
            subject={subject} 
            bloomsData={bloomsData} 
            fetchSubjectData={fetchSubjectData} 
          />
        </div>
      </TabsContent>
      
      <TabsContent value="papers" className="mt-6">
        <PapersManagement 
          subject={subject} 
          subjectFiles={subjectFiles} 
          fetchSubjectFiles={fetchSubjectFiles} 
        />
      </TabsContent>
    </div>
  );
}
