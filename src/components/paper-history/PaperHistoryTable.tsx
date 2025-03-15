
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GeneratedPaper } from "@/types/papers";
import { Download, Eye } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PaperHistoryTableProps {
  filteredPapers: GeneratedPaper[];
  isLoading: boolean;
  viewPaperDetails: (paper: GeneratedPaper) => void;
  handleDownload: (paper: GeneratedPaper) => void;
}

export function PaperHistoryTable({
  filteredPapers,
  isLoading,
  viewPaperDetails,
  handleDownload
}: PaperHistoryTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="text-center py-8">Loading paper history...</div>;
  }

  if (filteredPapers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No papers found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/dashboard/paper-generation")}
        >
          Generate New Paper
        </Button>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Topic</TableHead>
          <TableHead>Questions</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredPapers.map((paper) => (
          <TableRow key={paper.id}>
            <TableCell>
              {format(new Date(paper.created_at), "dd MMM yyyy")}
            </TableCell>
            <TableCell>{paper.subject_name}</TableCell>
            <TableCell>{paper.topic}</TableCell>
            <TableCell>
              {Array.isArray(paper.questions) ? paper.questions.length : 'N/A'}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewPaperDetails(paper)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(paper)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
