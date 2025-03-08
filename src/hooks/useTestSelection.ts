
import { useState } from "react";
import { useClasses } from "./test-selection/useClasses";
import { useSubjects } from "./test-selection/useSubjects";
import { useTests } from "./test-selection/useTests";
import { useTestFiles, TestFile } from "./test-selection/useTestFiles";
import { useClassStudents } from "./test-selection/useClassStudents";
import type { Class } from "@/hooks/useClassData";
import type { Student, Subject } from "@/types/dashboard";
import type { Test } from "@/types/tests";

export { TestFile } from "./test-selection/useTestFiles";

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

  return { 
    selectedClass, setSelectedClass,
    selectedSubject, setSelectedSubject,
    selectedTest, setSelectedTest,
    classes, subjects, tests, testFiles, classStudents,
    isLoading, setIsLoading
  };
}
