
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit2, Upload, FileText } from "lucide-react";
import { useUploadThing } from "@/utils/uploadthing";
import { FileUploader } from "@/components/ui/uploadthing";
import type { Subject, Student, BloomsTaxonomy } from "@/types/dashboard";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [bloomsData, setBloomsData] = useState<BloomsTaxonomy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBloomsData, setEditedBloomsData] = useState<BloomsTaxonomy | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { startUpload } = useUploadThing("documentUploader");

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
    }
  }, [id]);

  const handleEditValue = (level: keyof BloomsTaxonomy, value: string) => {
    if (!editedBloomsData) return;
    
    const numValue = Number(value);
    if (isNaN(numValue)) return;

    setEditedBloomsData({
      ...editedBloomsData,
      [level]: numValue
    });
  };

  const handleStartEditing = () => {
    setEditedBloomsData(bloomsData || {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0
    });
    setIsEditing(true);
  };

  const handleSaveBloomsTaxonomy = async () => {
    if (!editedBloomsData || !id) return;

    try {
      const bloomsTaxonomyJson = {
        remember: editedBloomsData.remember,
        understand: editedBloomsData.understand,
        apply: editedBloomsData.apply,
        analyze: editedBloomsData.analyze,
        evaluate: editedBloomsData.evaluate,
        create: editedBloomsData.create
      };

      const { error } = await supabase
        .from('answer_keys')
        .insert({
          subject_id: id,
          title: `${subject?.name || 'Subject'} - Bloom's Taxonomy Update`,
          content: {},
          blooms_taxonomy: bloomsTaxonomyJson
        } as any);

      if (error) throw error;

      toast.success("Bloom's taxonomy updated successfully");
      setIsEditing(false);
      fetchSubjectData();
    } catch (error: any) {
      toast.error('Failed to update Bloom\'s taxonomy');
      console.error('Error:', error);
    }
  };

  const handleFileUploadComplete = async (res: any) => {
    if (!id || !res || res.length === 0) return;
    
    try {
      const fileUrl = res[0].url;
      
      const { error: updateError } = await supabase
        .from('subjects')
        .update({ information_pdf_url: fileUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('PDF uploaded successfully');
      fetchSubjectData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to update subject with PDF URL');
    }
  };

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
            <div className="space-y-4">
              <div className="space-y-2">
                <p><strong>Subject Code:</strong> {subject.subject_code}</p>
                <p><strong>Semester:</strong> {subject.semester}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Subject Information PDF</p>
                {subject.information_pdf_url ? (
                  <div className="flex items-center gap-2">
                    <a 
                      href={subject.information_pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <FileText className="h-4 w-4" />
                      View PDF
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No PDF uploaded</p>
                )}
                
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Upload PDF</p>
                  <FileUploader 
                    endpoint="documentUploader" 
                    onUploadComplete={handleFileUploadComplete}
                    className="border-2 border-dashed rounded-md"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Bloom's Taxonomy Distribution</CardTitle>
              {!isEditing && (
                <Button variant="ghost" size="sm" onClick={handleStartEditing}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isEditing ? (
                <>
                  {editedBloomsData && Object.entries(editedBloomsData).map(([level, value]) => (
                    <div key={level} className="space-y-2">
                      <div>
                        <label className="text-sm capitalize font-medium">{level} %</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={value}
                          onChange={(e) => handleEditValue(level as keyof BloomsTaxonomy, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleSaveBloomsTaxonomy}>Save</Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {bloomsData && Object.entries(bloomsData).map(([level, value]) => (
                    <div key={level} className="grid grid-cols-2 gap-4">
                      <p className="capitalize"><strong>{level}:</strong></p>
                      <p>{value}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
