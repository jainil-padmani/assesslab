
import { useState, useCallback } from "react";
import { useClasses } from "./test-selection/useClasses";
import { useSubjects } from "./test-selection/useSubjects";
import { useTests } from "./test-selection/useTests";
import { useTestFiles } from "./test-selection/useTestFiles";
import { useClassStudents } from "./test-selection/useClassStudents";
import { toast } from "sonner";
import type { Class } from "@/hooks/useClassData";
import type { Student, Subject } from "@/types/dashboard";
import type { Test } from "@/types/tests";

// Use 'export type' to re-export the type
export type { TestFile } from "./test-selection/useTestFiles";

export function useTestSelection() {
  // Step selections
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTest, setSelectedTest] = useState("");
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  
  // Import data from the smaller hooks
  const { classes } = useClasses();
  const { subjects } = useSubjects(selectedClass);
  const { tests } = useTests(selectedClass, selectedSubject);
  const { testFiles, fetchTestPapers, isLoading: isLoadingTestFiles } = useTestFiles(selectedTest);
  const { classStudents } = useClassStudents(selectedClass);

  // Handle refreshing test files
  const refreshTestFiles = useCallback(async () => {
    if (!selectedTest) {
      toast.error("No test selected");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Manually refreshing test files for:", selectedTest);
      await fetchTestPapers(true); // Force refresh
      toast.success("Test files refreshed successfully");
    } catch (error) {
      console.error("Error refreshing test files:", error);
      toast.error("Failed to refresh test files");
    } finally {
      setIsLoading(false);
    }
  }, [selectedTest, fetchTestPapers]);

  return { 
    selectedClass, setSelectedClass,
    selectedSubject, setSelectedSubject,
    selectedTest, setSelectedTest,
    classes, subjects, tests, testFiles, classStudents,
    isLoading: isLoading || isLoadingTestFiles, 
    setIsLoading,
    refetchTestFiles: refreshTestFiles
  };
}
