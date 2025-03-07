import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/dashboard";
import { 
  listStorageFiles, 
  getPublicUrl, 
  forceRefreshStorage,
  uploadStorageFile 
} from "@/utils/fileStorage/storageHelpers";
import { deleteFileGroup } from "@/utils/subjectFilesUtils";
import type { UploadedFile } from './FilesList';
import type { FileUploadState } from './FileUploadSteps';

export const useFileManagement = () => {
  const uploadSteps = [
    {
      id: 1,
      title: "Select Subject and Topic",
      description: "Select a subject and add a topic for the files you're uploading.",
      fileTypes: [],
      isRequired: true
    },
    {
      id: 2,
      title: "Add Question Paper",
      description: "Upload the question paper file. This is required to proceed.",
      fileTypes: [".pdf", ".docx", ".png", ".jpeg", ".jpg"],
      isRequired: true
    },
    {
      id: 3,
      title: "Add Answer Key",
      description: "Upload the answer key file. This is now required for all papers.",
      fileTypes: [".pdf", ".docx", ".png", ".jpeg", ".jpg"],
      isRequired: true
    },
    {
      id: 4,
      title: "Add Handwritten Paper (Optional)",
      description: "Upload handwritten answer sheets. You can skip this step if not applicable.",
      fileTypes: [".pdf", ".png", ".jpeg", ".jpg"],
      isRequired: false
    }
  ];

  const [fileUploadState, setFileUploadState] = useState<FileUploadState>({
    questionPaper: null,
    answerKey: null,
    handwrittenPaper: null,
    subjectId: "",
    topic: "",
    currentStep: 1
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
    fetchSubjects();
    fetchUploadedFiles();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchSubjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to view subjects');
        return;
      }
      
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects');
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to view files');
        return;
      }

      await forceRefreshStorage();
      
      const storageData = await listStorageFiles();

      if (!storageData || storageData.length === 0) {
        setUploadedFiles([]);
        return;
      }

      const { data: userSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id);
        
      if (subjectsError) throw subjectsError;
      
      const userSubjectIds = new Set(userSubjects?.map(s => s.id) || []);
      
      const { data: userTests, error: testsError } = await supabase
        .from('tests')
        .select('id, name, subject_id')
        .eq('user_id', user.id);
        
      if (testsError) throw testsError;
      
      const fileGroups: { [key: string]: UploadedFile } = {};
      
      if (storageData) {
        console.log("Processing storage files for file management:", storageData.length);
        
        for (const file of storageData) {
          const fileName = file.name;
          const parts = fileName.split('_');
          
          if (parts.length < 3) continue;
          
          const filePrefix = parts[0];
          const topic = parts[1];
          let groupKey = `${filePrefix}_${topic}`;
          let subjectId = '';
          let isUserFile = false;
          
          if (filePrefix === 'test' && parts.length >= 4) {
            const testId = parts[1];
            groupKey = `test_${testId}_${topic}`;
            
            const userTest = userTests?.find(t => t.id === testId);
            if (userTest) {
              isUserFile = true;
              subjectId = userTest.subject_id;
            }
          } else {
            subjectId = filePrefix;
            isUserFile = userSubjectIds.has(subjectId);
          }
          
          if (!isUserFile) continue;
          
          let fileType = null;
          
          if (fileName.includes('questionPaper')) {
            fileType = 'questionPaper';
          } else if (fileName.includes('answerKey')) {
            fileType = 'answerKey';
          } else if (fileName.includes('handwrittenPaper')) {
            fileType = 'handwrittenPaper';
          }
                           
          if (!fileType) continue;
          
          let subjectName = 'Unknown Subject';
          
          if (groupKey.startsWith('test_')) {
            const testId = groupKey.split('_')[1];
            const userTest = userTests?.find(t => t.id === testId);
            
            if (userTest) {
              const subject = userSubjects?.find(s => s.id === userTest.subject_id);
              subjectName = subject ? `${subject.name} (Test: ${userTest.name})` : `Test: ${userTest.name}`;
            }
          } else {
            const subject = userSubjects?.find(s => s.id === subjectId);
            subjectName = subject ? subject.name : 'Unknown Subject';
          }
          
          if (!fileGroups[groupKey]) {
            fileGroups[groupKey] = {
              id: groupKey,
              subject_id: subjectId,
              subject_name: subjectName,
              topic: topic,
              question_paper_url: '',
              answer_key_url: '',
              handwritten_paper_url: null,
              created_at: file.created_at || new Date().toISOString(),
              user_id: user.id
            };
          }
          
          const { data: { publicUrl } } = getPublicUrl(fileName);
          
          if (fileType === 'questionPaper') {
            fileGroups[groupKey].question_paper_url = publicUrl;
          } else if (fileType === 'answerKey') {
            fileGroups[groupKey].answer_key_url = publicUrl;
          } else if (fileType === 'handwrittenPaper') {
            fileGroups[groupKey].handwritten_paper_url = publicUrl;
          }
        }
      }
      
      const files = Object.values(fileGroups).filter(
        file => file.question_paper_url
      );
      
      console.log("Processed file groups for file management:", files.length);
      setUploadedFiles(files);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      toast.error('Failed to fetch uploaded files');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, stepId: number) => {
    if (!event.target.files || event.target.files.length === 0) {
      switch (stepId) {
        case 2:
          setFileUploadState({ ...fileUploadState, questionPaper: null });
          break;
        case 3:
          setFileUploadState({ ...fileUploadState, answerKey: null });
          break;
        case 4:
          setFileUploadState({ ...fileUploadState, handwrittenPaper: null });
          break;
      }
      return;
    }

    const file = event.target.files[0];
    
    switch (stepId) {
      case 2:
        setFileUploadState({ ...fileUploadState, questionPaper: file });
        break;
      case 3:
        setFileUploadState({ ...fileUploadState, answerKey: file });
        break;
      case 4:
        setFileUploadState({ ...fileUploadState, handwrittenPaper: file });
        break;
    }
  };

  const handleNextStep = () => {
    if (fileUploadState.currentStep < uploadSteps.length) {
      setFileUploadState({ 
        ...fileUploadState, 
        currentStep: fileUploadState.currentStep + 1 
      });
    }
  };

  const handlePrevStep = () => {
    if (fileUploadState.currentStep > 1) {
      setFileUploadState({ 
        ...fileUploadState, 
        currentStep: fileUploadState.currentStep - 1 
      });
    }
  };

  const handleSkipStep = () => {
    if (fileUploadState.currentStep === 4) {
      handleSubmitFiles();
    } else if (fileUploadState.currentStep !== 3) {
      handleNextStep();
    } else {
      toast.error("Answer key is now required. Please upload an answer key before proceeding.");
    }
  };

  const uploadFile = async (file: File, uploadType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to upload files');
      
      const { data: subject } = await supabase
        .from('subjects')
        .select('user_id')
        .eq('id', fileUploadState.subjectId)
        .single();
      
      if (!subject || subject.user_id !== user.id) {
        throw new Error('You do not have permission to upload files to this subject');
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${fileUploadState.subjectId}_${fileUploadState.topic}_${uploadType}_${Date.now()}.${fileExt}`;

      await uploadStorageFile(fileName, file);

      // Insert record into subject_documents
      await supabase.from('subject_documents').insert({
        subject_id: fileUploadState.subjectId,
        user_id: user.id,
        file_name: fileName,
        document_type: uploadType,
        document_url: getPublicUrl(fileName).data.publicUrl,
        file_type: fileExt,
        file_size: file.size
      });

      const { data: { publicUrl } } = getPublicUrl(fileName);
      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${uploadType}:`, error);
      throw error;
    }
  };

  const handleSubmitFiles = async () => {
    if (!fileUploadState.subjectId) {
      toast.error("Please select a subject");
      return;
    }

    if (!fileUploadState.topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    if (!fileUploadState.questionPaper) {
      toast.error("Question paper is required");
      return;
    }

    if (!fileUploadState.answerKey) {
      toast.error("Answer key is now required");
      return;
    }

    setIsUploading(true);

    try {
      await uploadFile(fileUploadState.questionPaper, 'questionPaper');
      await uploadFile(fileUploadState.answerKey, 'answerKey');
      
      if (fileUploadState.handwrittenPaper) {
        await uploadFile(fileUploadState.handwrittenPaper, 'handwrittenPaper');
      }
      
      toast.success("Files uploaded successfully!");
      
      setFileUploadState({
        questionPaper: null,
        answerKey: null,
        handwrittenPaper: null,
        subjectId: "",
        topic: "",
        currentStep: 1
      });

      await fetchUploadedFiles();
      
      setActiveTab("files");
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileGroup: UploadedFile) => {
    try {
      if (fileGroup.user_id !== currentUserId) {
        toast.error("You don't have permission to delete these files");
        return;
      }
      
      const parts = fileGroup.id.split('_');
      let filePrefix, topic;
      
      if (parts[0] === 'test' && parts.length >= 3) {
        filePrefix = `test_${parts[1]}`;
        topic = parts[2];
      } else if (parts.length >= 2) {
        filePrefix = parts[0];
        topic = parts[1];
      } else {
        toast.error("Invalid file identifier");
        return;
      }
      
      console.log(`Attempting to delete file group: prefix=${filePrefix}, topic=${topic}`);
      
      const success = await deleteFileGroup(filePrefix, topic);
      
      if (success) {
        toast.success("Files deleted successfully");
        await fetchUploadedFiles();
      }
    } catch (error) {
      console.error("Error deleting files:", error);
      toast.error("Failed to delete files");
    }
  };

  return {
    uploadSteps,
    fileUploadState,
    setFileUploadState,
    subjects,
    uploadedFiles,
    isUploading,
    activeTab,
    setActiveTab,
    currentUserId,
    handleFileSelect,
    handleNextStep,
    handlePrevStep,
    handleSkipStep,
    handleSubmitFiles,
    handleDeleteFile,
  };
};
