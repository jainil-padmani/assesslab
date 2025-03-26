
import { toast } from "sonner";
import type { SubjectFile } from "@/types/dashboard";
import { copyAndRecord } from "./copyAndRecord";
import { verifySourceFiles } from "./fileVerification";
import { sanitizeTopic } from "./fileExtractors";

/**
 * Assigns subject files to a test
 * 
 * @param testId The ID of the test to assign files to
 * @param subjectFile The subject file to assign
 * @returns True if successful, false otherwise
 */
export const assignSubjectFilesToTest = async (
  testId: string,
  subjectFile: SubjectFile
): Promise<boolean> => {
  try {
    console.log(`Assigning subject file "${subjectFile.topic}" to test ${testId}`);
    
    // Verify that source files exist
    const { success: filesVerified } = await verifySourceFiles(subjectFile);
    if (!filesVerified) {
      throw new Error("Source files not available or incomplete");
    }
    
    // Process topic for file naming
    const sanitizedTopic = sanitizeTopic(subjectFile.topic);
    
    // Define destination file key (test_{testId}_{topic})
    const destKeyPrefix = `test_${testId}_${sanitizedTopic}`;
    
    // Create timestamp for file versioning
    const timestamp = Date.now();
    
    // Copy the question paper
    if (subjectFile.question_paper_url) {
      await copyAndRecord(
        subjectFile.question_paper_url,
        `${destKeyPrefix}_questionPaper_${timestamp}`,
        testId
      );
    }
    
    // Copy the answer key
    if (subjectFile.answer_key_url) {
      await copyAndRecord(
        subjectFile.answer_key_url,
        `${destKeyPrefix}_answerKey_${timestamp}`,
        testId
      );
    }
    
    // Copy the handwritten paper if it exists
    if (subjectFile.handwritten_paper_url) {
      await copyAndRecord(
        subjectFile.handwritten_paper_url,
        `${destKeyPrefix}_handwrittenPaper_${timestamp}`,
        testId
      );
    }
    
    console.log(`Successfully assigned subject file "${subjectFile.topic}" to test ${testId}`);
    toast.success(`Successfully assigned "${subjectFile.topic}" to test`);
    return true;
    
  } catch (error: any) {
    console.error('Error assigning subject files to test:', error);
    toast.error(`Failed to assign files: ${error.message}`);
    return false;
  }
};
