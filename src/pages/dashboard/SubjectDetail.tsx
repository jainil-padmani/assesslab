import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit2, Upload, FileText, FilePlus, FileCheck, Download, Trash2 } from "lucide-react";
import type { Subject, Student, BloomsTaxonomy, SubjectFile } from "@/types/dashboard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [bloomsData, setBloomsData] = useState<BloomsTaxonomy | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBloomsData, setEditedBloomsData] = useState<BloomsTaxonomy | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingPaper, setIsUploadingPaper] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [topic, setTopic] = useState("");
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [answerKey, setAnswerKey] = useState<File | null>(null);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('subject-information')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('subject-information')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('subjects')
        .update({ information_pdf_url: publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('PDF uploaded successfully');
      fetchSubjectData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload PDF');
    } finally {
      setIsUploading(false);
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

  const uploadSubjectPaper = async () => {
    if (!id || !topic.trim() || !questionPaper || !answerKey) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsUploadingPaper(true);

    try {
      const questionPaperUrl = await uploadFile(questionPaper, 'questionPaper');
      
      const answerKeyUrl = await uploadFile(answerKey, 'answerKey');
      
      toast.success("Files uploaded successfully!");
      
      setTopic("");
      setQuestionPaper(null);
      setAnswerKey(null);
      setOpenUploadDialog(false);
      
      fetchSubjectFiles();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setIsUploadingPaper(false);
    }
  };

  const uploadFile = async (file: File, fileType: string): Promise<string> => {
    try {
      const fileExt = file.name.split('.').pop();
      const sanitizedTopic = topic.replace(/\s+/g, '_');
      const fileName = `${id}_${sanitizedTopic}_${fileType}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
      throw error;
    }
  };

  const handleDeleteFile = async (file: SubjectFile) => {
    try {
      const { data: storageFiles, error: listError } = await supabase
        .storage
        .from('files')
        .list();
        
      if (listError) throw listError;
      
      const groupPrefix = `${file.subject_id}_${file.topic}_`;
      const filesToDelete = storageFiles?.filter(storageFile => 
        storageFile.name.startsWith(groupPrefix)
      ) || [];
        
      for (const storageFile of filesToDelete) {
        const { error: deleteError } = await supabase
          .storage
          .from('files')
          .remove([storageFile.name]);
            
        if (deleteError) throw deleteError;
      }

      toast.success("Files deleted successfully");
      fetchSubjectFiles();
    } catch (error) {
      console.error("Error deleting files:", error);
      toast.error("Failed to delete files");
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
                  
                  <div className="mt-2">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="pdf-upload"
                      disabled={isUploading}
                    />
                    <label htmlFor="pdf-upload">
                      <Button 
                        variant="outline" 
                        className="cursor-pointer" 
                        disabled={isUploading}
                        asChild
                      >
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {isUploading ? 'Uploading...' : subject.information_pdf_url ? 'Change PDF' : 'Upload PDF'}
                        </span>
                      </Button>
                    </label>
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
      </TabsContent>
      
      <TabsContent value="papers" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Subject Papers</CardTitle>
              <CardDescription>Manage question papers and answer keys for this subject</CardDescription>
            </div>
            <Dialog open={openUploadDialog} onOpenChange={setOpenUploadDialog}>
              <DialogTrigger asChild>
                <Button>
                  <FilePlus className="mr-2 h-4 w-4" />
                  Add Papers
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Upload Subject Papers</DialogTitle>
                  <DialogDescription>
                    Add a question paper and its answer key for this subject.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="topic" className="text-right">
                      Topic
                    </Label>
                    <Input
                      id="topic"
                      className="col-span-3"
                      placeholder="Enter topic or title"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="question-paper" className="text-right">
                      Question Paper
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="question-paper"
                        type="file"
                        accept=".pdf,.docx,.png,.jpeg,.jpg"
                        onChange={(e) => setQuestionPaper(e.target.files?.[0] || null)}
                      />
                      {questionPaper && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {questionPaper.name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="answer-key" className="text-right">
                      Answer Key
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="answer-key"
                        type="file"
                        accept=".pdf,.docx,.png,.jpeg,.jpg"
                        onChange={(e) => setAnswerKey(e.target.files?.[0] || null)}
                      />
                      {answerKey && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {answerKey.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    type="submit"
                    onClick={uploadSubjectPaper}
                    disabled={isUploadingPaper || !topic.trim() || !questionPaper || !answerKey}
                  >
                    {isUploadingPaper ? 'Uploading...' : 'Upload Papers'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          
          <CardContent>
            {subjectFiles.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground">No papers uploaded yet for this subject.</p>
                <Button variant="outline" className="mt-4" onClick={() => setOpenUploadDialog(true)}>
                  <FilePlus className="mr-2 h-4 w-4" />
                  Add Your First Paper
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subjectFiles.map((file) => (
                  <Card key={file.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 py-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base truncate" title={file.topic}>
                          {file.topic}
                        </CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteFile(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <a 
                          href={file.question_paper_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <FilePlus className="h-5 w-5 mr-2 text-primary" />
                          <div>
                            <div className="text-sm font-medium">Question Paper</div>
                            <div className="text-xs text-muted-foreground">View document</div>
                          </div>
                        </a>
                        
                        <a 
                          href={file.answer_key_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <FileCheck className="h-5 w-5 mr-2 text-primary" />
                          <div>
                            <div className="text-sm font-medium">Answer Key</div>
                            <div className="text-xs text-muted-foreground">View document</div>
                          </div>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  );
}
