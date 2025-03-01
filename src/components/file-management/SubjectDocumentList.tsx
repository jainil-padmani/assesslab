
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Download, Trash2, FileText, FileImage, FileArchive } from "lucide-react";
import { toast } from "sonner";
import { Subject, SubjectDocument } from "@/types/dashboard";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface SubjectDocumentListProps {
  subject: Subject;
  onBackClick: () => void;
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return <FileText className="text-red-500" />;
  if (fileType.includes("image")) return <FileImage className="text-blue-500" />;
  if (fileType.includes("word")) return <FileText className="text-blue-600" />;
  return <FileArchive className="text-gray-500" />;
}

export function SubjectDocumentList({ subject, onBackClick }: SubjectDocumentListProps) {
  const [documents, setDocuments] = useState<SubjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const { data, error } = await supabase
          .from("subject_documents")
          .select("*")
          .eq("subject_id", subject.id);
        
        if (error) throw error;
        
        setDocuments(data as SubjectDocument[]);
      } catch (error: any) {
        toast.error(`Error fetching documents: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, [subject.id]);

  const handleViewDocument = (url: string) => {
    window.open(url, "_blank");
  };

  const handleDownloadDocument = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      const docToDelete = documents.find(doc => doc.id === id);
      if (!docToDelete) return;
      
      // Delete from database
      const { error } = await supabase
        .from("subject_documents")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      // Remove the file name from the URL to get storage path
      const fileUrl = new URL(docToDelete.document_url);
      const filePath = fileUrl.pathname.split('/').pop();
      
      if (filePath) {
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from("subject-documents")
          .remove([filePath]);
        
        if (storageError) throw storageError;
      }
      
      setDocuments(documents.filter(doc => doc.id !== id));
      toast.success("Document deleted successfully");
    } catch (error: any) {
      toast.error(`Error deleting document: ${error.message}`);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch(type) {
      case "questionPaper": return "Question Paper";
      case "answerKey": return "Answer Key";
      case "handwrittenPaper": return "Handwritten Paper";
      default: return type;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Documents for {subject.name}</CardTitle>
        <Button variant="outline" onClick={onBackClick}>
          Back to Subjects
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No documents found for this subject.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getFileIcon(doc.file_type)}
                      {getDocumentTypeLabel(doc.document_type)}
                    </div>
                  </TableCell>
                  <TableCell>{doc.file_name}</TableCell>
                  <TableCell>
                    {doc.file_size < 1024 * 1024
                      ? `${Math.round(doc.file_size / 1024)} KB`
                      : `${Math.round((doc.file_size / 1024 / 1024) * 10) / 10} MB`}
                  </TableCell>
                  <TableCell>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDocument(doc.document_url)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadDocument(doc.document_url, doc.file_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
