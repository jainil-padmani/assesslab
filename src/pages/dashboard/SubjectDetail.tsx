
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Subject, Student, BloomsTaxonomy } from "@/types/dashboard";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [bloomsData, setBloomsData] = useState<BloomsTaxonomy | null>(null);

  const validateAndTransformBloomsTaxonomy = (data: any): BloomsTaxonomy | null => {
    if (!data || typeof data !== 'object') return null;

    const defaultLevel = { delivery: 0, evaluation: 0 };
    const requiredLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
    
    // Check if all required levels exist
    const hasAllLevels = requiredLevels.every(level => 
      data[level] && 
      typeof data[level].delivery === 'number' && 
      typeof data[level].evaluation === 'number'
    );

    if (!hasAllLevels) return null;

    return {
      remember: { ...defaultLevel, ...data.remember },
      understand: { ...defaultLevel, ...data.understand },
      apply: { ...defaultLevel, ...data.apply },
      analyze: { ...defaultLevel, ...data.analyze },
      evaluate: { ...defaultLevel, ...data.evaluate },
      create: { ...defaultLevel, ...data.create }
    };
  };

  useEffect(() => {
    if (id) {
      fetchSubjectData();
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

      // Fetch the latest answer key's Bloom's taxonomy data
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

  if (!subject) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{subject.name}</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subject Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Subject Code:</strong> {subject.subject_code}</p>
              <p><strong>Semester:</strong> {subject.semester}</p>
            </div>
          </CardContent>
        </Card>

        {bloomsData && (
          <Card>
            <CardHeader>
              <CardTitle>Bloom's Taxonomy Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(bloomsData).map(([level, data]) => (
                  <div key={level} className="grid grid-cols-2 gap-4">
                    <p className="capitalize"><strong>{level}:</strong></p>
                    <div>
                      <p>Delivery: {data.delivery}%</p>
                      <p>Evaluation: {data.evaluation}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
