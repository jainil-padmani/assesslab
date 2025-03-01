
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Trash2, ExternalLink, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Subject } from "@/types/dashboard";

interface SubjectDocument {
  id: string;
  subject_id: string;
  document_type: string;
  document_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface SubjectDocumentListProps {
  subject: Subject;
  onUploadNew: () => void;
}

export function SubjectDocumentList({ subject, onUploadNew }: SubjectDocumentListProps) {
  const [documents, setDocuments] = useState<SubjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [subject.id]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subject_documents')
        .select('*')
        .eq('subject_id', subject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast.error(`Failed to fetch documents: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (document: SubjectDocument) => {
    if (!confirm(`Are you sure you want to delete ${document.file_name}?`)) {
      return;
    }

    try {
      // Extract file path from URL
      const fileUrl = new URL(document.document_url);
      const filePath = fileUrl.pathname.split('/').pop();
      
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('subject-documents')
          .remove([filePath]);
          
        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from('subject_documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;

      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error: any) {
      toast.error(`Failed to delete document: ${error.message}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentTypeLabel = (type: string): string => {
    switch (type) {
      case 'questionPaper': return 'Question Paper';
      case 'answerKey': return 'Answer Key';
      case 'handwrittenPaper': return 'Handwritten Paper';
      default: return type;
    }
  };

  if (isLoading) {
    return <div>Loading documents...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" />
          Documents for {subject.name}
        </CardTitle>
        <Button onClick={onUploadNew} className="bg-accent hover:bg-accent/90">
          <FileUp className="mr-2 h-4 w-4" />
          Upload New Documents
        </Button>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No documents uploaded yet.</p>
            <Button onClick={onUploadNew}>
              <FileUp className="mr-2 h-4 w-4" />
              Upload Documents
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {['questionPaper', 'answerKey', 'handwrittenPaper'].map(docType => {
              const typeDocuments = documents.filter(doc => doc.document_type === docType);
              
              if (typeDocuments.length === 0) return null;
              
              return (
                <div key={docType} className="space-y-2">
                  <h3 className="text-lg font-medium">{getDocumentTypeLabel(docType)}</h3>
                  <div className="border rounded-md divide-y">
                    {typeDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.file_name}</p>
                            <div className="flex items-center text-xs text-muted-foreground gap-2">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.document_url} download={doc.file_name}>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteDocument(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
