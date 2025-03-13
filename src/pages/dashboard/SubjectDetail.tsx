
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Subject, Student, BloomsTaxonomy, SubjectFile, CourseOutcome } from "@/types/dashboard";
import { SubjectInfo } from "@/components/subject/SubjectInfo";
import { BloomsTaxonomy as BloomsTaxonomyComponent } from "@/components/subject/BloomsTaxonomy";
import { PapersManagement } from "@/components/subject/PapersManagement";
import { SubjectStudents } from "@/components/subject/SubjectStudents";
import { fetchSubjectFiles } from "@/utils/subjectFilesUtils";
import { GeneratedPapers } from "@/components/subject/GeneratedPapers";
import { CourseOutcomes } from "@/components/subject/CourseOutcomes";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [bloomsData, setBloomsData] = useState<BloomsTaxonomy | null>(null);
  const [subjectFiles, setSubjectFiles] = useState<SubjectFile[]>([]);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (id) {
      fetchSubjectData();
      fetchAndSetSubjectFiles();
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
        // Safely convert from Json to BloomsTaxonomy
        const rawData = answerKeyData.blooms_taxonomy;
        if (typeof rawData === 'object' && rawData !== null && !Array.isArray(rawData)) {
          const convertedData = {
            remember: Number(rawData.remember) || 0,
            understand: Number(rawData.understand) || 0,
            apply: Number(rawData.apply) || 0,
            analyze: Number(rawData.analyze) || 0,
            evaluate: Number(rawData.evaluate) || 0,
            create: Number(rawData.create) || 0
          };
          setBloomsData(convertedData);
        } else {
          // Set default values if conversion fails
          setBloomsData({
            remember: 20,
            understand: 20,
            apply: 15,
            analyze: 15,
            evaluate: 15,
            create: 15
          });
        }
      }
    } catch (error: any) {
      toast.error('Failed to fetch subject data');
      console.error('Error:', error);
    }
  };

  const fetchAndSetSubjectFiles = async () => {
    if (id) {
      const files = await fetchSubjectFiles(id);
      setSubjectFiles(files);
    }
  };

  if (!subject) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{subject.name}</h1>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-[500px]">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Subject Info</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="papers">Papers</TabsTrigger>
            <TabsTrigger value="generated">Generated Papers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="mt-6">
        {activeTab === "info" ? (
          <div className="space-y-6">
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
            <CourseOutcomes subject={subject} fetchSubjectData={fetchSubjectData} />
          </div>
        ) : activeTab === "students" ? (
          <SubjectStudents
            subject={subject}
            fetchSubjectData={fetchSubjectData}
          />
        ) : activeTab === "papers" ? (
          <PapersManagement 
            subject={subject} 
            subjectFiles={subjectFiles} 
            fetchSubjectFiles={fetchAndSetSubjectFiles} 
          />
        ) : (
          <GeneratedPapers subjectId={subject.id} />
        )}
      </div>
    </div>
  );
}
