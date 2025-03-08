
import React from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Test } from "@/types/tests";

interface TestHeaderProps {
  test: Test & { subjects: { name: string, subject_code: string } };
}

export function TestHeader({ test }: TestHeaderProps) {
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/dashboard/tests/subject/${test.subject_id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Subject Tests
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{test.name}</h1>
        <div className="flex gap-4 mt-2 text-gray-600">
          <p>Subject: {test.subjects?.name}</p>
          <p>Date: {format(new Date(test.test_date), 'dd MMM yyyy')}</p>
          <p>Maximum Marks: {test.max_marks}</p>
        </div>
      </div>
    </>
  );
}
