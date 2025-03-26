
import { toast } from "sonner";
import { forceRefreshStorage } from "../storageHelpers";
import { verifyTestAndSubjectFile } from "./fileVerification";
import { sanitizeTopic } from "./fileExtractors";
import { copyFilesAndRecordInDb } from "./copyAndRecord";
import type { SubjectFile } from "@/types/dashboard";

/**
 * Assigns existing subject files to a test
 * 
 * @param testId The test ID to assign files to
 * @param subjectFile The subject file to assign
 * @returns Boolean indicating success
 */
export const assignSubjectFilesToTest = async (
  testId: string,
  subjectFile: SubjectFile
): Promise<boolean> => {
  try {
    console.log('Assigning subject file to test:', { testId, subjectFile });
    
    // Verify test ownership and subject file validity
    const verification = await verifyTestAndSubjectFile(testId, subjectFile);
    
    if (!verification.isValid) {
      toast.error(`Failed to assign files: ${verification.error}`);
      return false;
    }
    
    const { test, user } = verification;

    // Force a refresh before copying
    await forceRefreshStorage();

    // Sanitize topic for use in filenames
    const originalTopic = subjectFile.topic;
    const sanitizedTopic = sanitizeTopic(originalTopic);
    
    // Create test prefix for filenames
    const testPrefix = `test_${testId}`;
    
    // Copy files and record in database
    const success = await copyFilesAndRecordInDb(
      testId,
      testPrefix,
      sanitizedTopic,
      subjectFile,
      user,
      test
    );
    
    if (success) {
      toast.success("Files assigned to test successfully");
      return true;
    } else {
      toast.error("Failed to assign files to test");
      return false;
    }
  } catch (error: any) {
    console.error('Error assigning files to test:', error);
    toast.error(`Failed to assign files: ${error.message}`);
    return false;
  }
};
