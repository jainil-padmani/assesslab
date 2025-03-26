import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MoreHorizontal, PlusIcon, Search, Upload, FileText, List, Grid } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/hooks/useUser';
import {
  UploadedFile,
  FilesListProps
} from '@/types/fileManagement';

// Import utility functions
import { fetchSubjectFiles, deleteFileGroup, uploadSubjectFile } from '@/utils/subjectFilesUtils';

export default function FileManagement() {
  const { user } = useUser();
  
  const currentUserId = user?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch subjects
  const { data: subjects = [], isLoading: isSubjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch files
  const { 
    data: files = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ['uploaded-files'],
    queryFn: () => fetchSubjectFiles(currentUserId || ''),
    enabled: !!currentUserId,
  });

  useEffect(() => {
    if (files) {
      setUploadedFiles(files as unknown as UploadedFile[]);
    }
  }, [files]);

  const queryClient = useQueryClient();

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, subjectId, topic }: { file: File, subjectId: string, topic: string }) => {
      if (!currentUserId) {
        throw new Error("User ID is required to upload files.");
      }
      
      setIsUploading(true);
      try {
        return await uploadSubjectFile(subjectId, topic, file, 'questionPaper');
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      toast.success('File uploaded successfully!');
      refetch();
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast.error(`File upload failed: ${error.message}`);
      setUploadProgress(0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileGroup: UploadedFile) => {
      try {
        return await deleteFileGroup(fileGroup.id, fileGroup.file_name.split('_')[0]);
      } catch (error: any) {
        toast.error(`File deletion failed: ${error.message}`);
        return false;
      }
    },
    onSuccess: () => {
      toast.success('File deleted successfully!');
      refetch();
    },
    onError: (error: any) => {
      toast.error(`File deletion failed: ${error.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedSubject || selectedSubject === 'all') {
      toast.error('Please select a subject before uploading.');
      return;
    }

    try {
      await uploadFileMutation.mutateAsync({ 
        file, 
        subjectId: selectedSubject,
        topic: 'default' // Add topic later
      });
    } catch (error: any) {
      toast.error(`File upload failed: ${error.message}`);
    }
  };

  const handleDeleteFile = async (fileGroup: UploadedFile) => {
    try {
      await deleteFileMutation.mutateAsync(fileGroup);
    } catch (error: any) {
      toast.error(`File deletion failed: ${error.message}`);
    }
  };
  
  // Fix the filtering logic to handle the document_type property
  const filteredFiles = useMemo(() => {
    let filtered = uploadedFiles;
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(file => {
        if (selectedCategory === 'question_paper') {
          return file.document_type === 'question_paper';
        } else if (selectedCategory === 'answer_key') {
          return file.document_type === 'answer_key';
        } else if (selectedCategory === 'answer_sheet') {
          return file.document_type === 'answer_sheet';
        } else if (selectedCategory === 'study_material') {
          return file.document_type === 'study_material';
        }
        return true;
      });
    }
    
    // Apply subject filter
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(file => file.subject_id === selectedSubject);
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(file =>
        file.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      const nameA = a.file_name.toLowerCase();
      const nameB = b.file_name.toLowerCase();
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
    
    return filtered;
  }, [uploadedFiles, selectedCategory, searchQuery, selectedSubject, sortOrder]);
  
  // Function to render file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) {
      return 'image';
    } else if (fileType.includes('pdf')) {
      return 'pdf';
    } else if (
      fileType.includes('word') ||
      fileType.includes('document')
    ) {
      return 'word';
    } else {
      return 'file';
    }
  };
  
  const FilesList: React.FC<FilesListProps> = ({ uploadedFiles, currentUserId, onDeleteFile, viewMode }) => (
    <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "divide-y border rounded-md"}>
      {uploadedFiles.map((file) => (
        <Card key={file.id} className={viewMode === 'grid' ? "shadow-md hover:shadow-lg transition-shadow duration-300" : "border-none"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium leading-none">
              {file.file_name}
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onDeleteFile(file)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                {getFileIcon(file.file_type) === 'image' ? (
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={file.document_url} alt={file.file_name} />
                    <AvatarFallback>{file.file_name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-24 w-24 rounded-md bg-secondary flex items-center justify-center">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {file.file_type.split('/')[1]?.toUpperCase()}
                  </p>
                  <Badge variant="secondary">{file.document_type}</Badge>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4 p-4">
                {getFileIcon(file.file_type) === 'image' ? (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={file.document_url} alt={file.file_name} />
                    <AvatarFallback>{file.file_name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-12 w-12 rounded-md bg-secondary flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{file.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.file_type.split('/')[1]?.toUpperCase()} | {file.document_type}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
  
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>File Management</CardTitle>
          <CardDescription>Upload, organize, and manage your files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="search">Search:</Label>
              <Input
                id="search"
                placeholder="Search files..."
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category">Category:</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="question_paper">Question Paper</SelectItem>
                    <SelectItem value="answer_key">Answer Key</SelectItem>
                    <SelectItem value="answer_sheet">Answer Sheet</SelectItem>
                    <SelectItem value="study_material">Study Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="subject">Subject:</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="sort">Sort Ascending:</Label>
                <Switch id="sort" checked={sortOrder === 'asc'} onCheckedChange={(checked) => setSortOrder(checked ? 'asc' : 'desc')} />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="upload">Upload File:</Label>
              <Input
                type="file"
                id="upload"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button disabled={isUploading}>
                <div className="cursor-pointer flex items-center">
                  <label htmlFor="upload" className="cursor-pointer flex items-center m-0">
                    {isUploading ? (
                      <>Uploading... {uploadProgress}%</>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Select File
                      </>
                    )}
                  </label>
                </div>
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label>View Mode:</Label>
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="mt-4 text-center">Loading files...</div>
      ) : filteredFiles.length === 0 ? (
        <div className="mt-4 text-center">No files found.</div>
      ) : (
        <FilesList
          uploadedFiles={filteredFiles}
          currentUserId={currentUserId || ''}
          onDeleteFile={handleDeleteFile}
          viewMode={viewMode}
        />
      )}
    </div>
  );
}
