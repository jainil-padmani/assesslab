/**
 * Get the URL for an answer sheet
 */
export async function getAnswerSheetUrl(studentId: string, subjectId: string, testId: string): Promise<string | null> {
  try {
    const objectName = `answer-sheets/${subjectId}/${testId}/${studentId}.pdf`;
    const { data, error } = await supabase
      .storage
      .from('test-files')
      .createSignedUrl(objectName, 60);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getAnswerSheetUrl:', error);
    return null;
  }
}

/**
 * Get the URL for an answer sheet ZIP
 */
export async function getAnswerSheetZipUrl(studentId: string, subjectId: string, testId: string): Promise<string | null> {
  try {
    const objectName = `answer-sheets/${subjectId}/${testId}/${studentId}.zip`;
    const { data, error } = await supabase
      .storage
      .from('test-files')
      .createSignedUrl(objectName, 60);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getAnswerSheetZipUrl:', error);
    return null;
  }
}
