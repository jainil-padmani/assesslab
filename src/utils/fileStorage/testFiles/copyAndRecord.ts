
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  copyStorageFile, 
  getPublicUrl,
  forceRefreshStorage 
} from "../storageHelpers";
import { 
  extractFilenameFromUrl, 
  getFileExtension 
} from "./fileExtractors";
import type { SubjectFile } from "@/types/dashboard";

/**
 * Copies subject files to test files and records in database
 * 
 * @param testId The test ID to assign files to
 * @param testPrefix The test prefix for file naming
 * @param sanitizedTopic The sanitized topic name
 * @param subjectFile The subject file to copy
 * @param user The current user object
 * @param test The test object
 * @returns Boolean indicating success
 */
export const copyFilesAndRecordInDb = async (
  testId: string,
  testPrefix: string,
  sanitizedTopic: string,
  subjectFile: SubjectFile,
  user: any,
  test: any
): Promise<boolean> => {
  try {
    console.log(`Processing files for topic: "${subjectFile.topic}" (sanitized to: "${sanitizedTopic}")`);
    
    // Extract file info from URLs
    const questionPaperUrl = subjectFile.question_paper_url;
    const answerKeyUrl = subjectFile.answer_key_url;
    
    const questionPaperFileName = extractFilenameFromUrl(questionPaperUrl);
    const answerKeyFileName = extractFilenameFromUrl(answerKeyUrl);
    
    console.log("Source filenames:", {
      questionPaper: questionPaperFileName,
      answerKey: answerKeyFileName,
      handwrittenPaper: subjectFile.handwritten_paper_url ? extractFilenameFromUrl(subjectFile.handwritten_paper_url) : "none"
    });
    
    // Create unique identifiers for the new files
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 8);
    
    // Get file extensions
    const questionPaperExt = getFileExtension(questionPaperFileName);
    const answerKeyExt = getFileExtension(answerKeyFileName);
    
    // Create new filenames with uniqueness
    const newQuestionPaperName = `${testPrefix}_${sanitizedTopic}_questionPaper_${timestamp}_${uniqueId}.${questionPaperExt}`;
    const newAnswerKeyName = `${testPrefix}_${sanitizedTopic}_answerKey_${timestamp}_${uniqueId}.${answerKeyExt}`;
    
    console.log("Destination filenames:", {
      questionPaper: newQuestionPaperName,
      answerKey: newAnswerKeyName
    });
    
    // Copy required files
    await copyStorageFile(questionPaperFileName, newQuestionPaperName);
    console.log(`Copied question paper to: ${newQuestionPaperName}`);
    
    await copyStorageFile(answerKeyFileName, newAnswerKeyName);
    console.log(`Copied answer key to: ${newAnswerKeyName}`);
    
    // Copy handwritten paper if available
    let newHandwrittenName = '';
    let handwrittenPublicUrl = null;
    
    if (subjectFile.handwritten_paper_url) {
      const handwrittenFileName = extractFilenameFromUrl(subjectFile.handwritten_paper_url);
      const handwrittenExt = getFileExtension(handwrittenFileName);
      newHandwrittenName = `${testPrefix}_${sanitizedTopic}_handwrittenPaper_${timestamp}_${uniqueId}.${handwrittenExt}`;
      await copyStorageFile(handwrittenFileName, newHandwrittenName);
      console.log(`Copied handwritten paper to: ${newHandwrittenName}`);
      handwrittenPublicUrl = getPublicUrl(newHandwrittenName).data.publicUrl;
    }

    // Refresh storage after copying
    await forceRefreshStorage();

    // Get public URLs for the new files
    const questionPaperPublicUrl = getPublicUrl(newQuestionPaperName).data.publicUrl;
    const answerKeyPublicUrl = getPublicUrl(newAnswerKeyName).data.publicUrl;

    // Prepare documents to insert
    const documentsToInsert = [
      {
        subject_id: test.subject_id,
        user_id: user.id,
        file_name: newQuestionPaperName,
        document_type: 'questionPaper',
        document_url: questionPaperPublicUrl,
        file_type: questionPaperExt,
        file_size: 0
      },
      {
        subject_id: test.subject_id,
        user_id: user.id,
        file_name: newAnswerKeyName,
        document_type: 'answerKey',
        document_url: answerKeyPublicUrl,
        file_type: answerKeyExt,
        file_size: 0
      }
    ];
    
    if (newHandwrittenName && handwrittenPublicUrl) {
      documentsToInsert.push({
        subject_id: test.subject_id,
        user_id: user.id,
        file_name: newHandwrittenName,
        document_type: 'handwrittenPaper',
        document_url: handwrittenPublicUrl,
        file_type: getFileExtension(newHandwrittenName),
        file_size: 0
      });
    }
    
    console.log("Inserting document records:", documentsToInsert);
    
    // Insert records into database
    const { error: insertError } = await supabase
      .from('subject_documents')
      .insert(documentsToInsert);
      
    if (insertError) {
      console.error("Error inserting document records:", insertError);
      throw insertError;
    }

    // Final refresh to ensure storage is updated
    await forceRefreshStorage();
    
    // Verify insertion
    const { data: insertedDocuments, error: verifyError } = await supabase
      .from('subject_documents')
      .select('*')
      .in('file_name', [newQuestionPaperName, newAnswerKeyName, newHandwrittenName].filter(Boolean));
      
    if (verifyError) {
      console.error("Error verifying inserted documents:", verifyError);
    } else {
      console.log("Verified inserted documents:", insertedDocuments?.length || 0, "records found");
    }

    console.log("Files assigned to test successfully");
    return true;
  } catch (error) {
    console.error('Error copying files and recording in DB:', error);
    return false;
  }
};
