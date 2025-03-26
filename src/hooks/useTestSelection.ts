
import { useState, useEffect } from "react";
import { useClasses } from "./test-selection/useClasses";
import { useSubjects } from "./test-selection/useSubjects";
import { useTests } from "./test-selection/useTests";
import { useTestFiles } from "./test-selection/useTestFiles";
import { useClassStudents } from "./test-selection/useClassStudents";
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
  const { testFiles } = useTestFiles(selectedTest);
  const { classStudents } = useClassStudents(selectedClass);

  // Clear dependent selections when parent selection changes
  useEffect(() => {
    if (selectedClass) {
      // If class changes, reset subject and test
      setSelectedSubject("");
      setSelectedTest("");
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
      // If subject changes, reset test
      setSelectedTest("");
    }
  }, [selectedSubject]);

  return { 
    selectedClass, setSelectedClass,
    selectedSubject, setSelectedSubject,
    selectedTest, setSelectedTest,
    classes, subjects, tests, testFiles, classStudents,
    isLoading, setIsLoading
  };
}
