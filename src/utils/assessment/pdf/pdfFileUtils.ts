
import { validatePdfFile } from "../fileValidation";
import { processPdfToZip } from "../pdfProcessingUtils";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Uploads a PDF file and processes it to ZIP if needed
 */
export const uploadPdfFile = async (file: File, studentId?: string): Promise<{ publicUrl: string, zipUrl?: string }> => {
  if (!validatePdfFile(file)) {
    throw new Error("Invalid file type. Only PDF files are allowed.");
  }

  // Generate a unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `answer_sheets/${fileName}`;
  
  // Upload the original file to Supabase storage
  const { error: uploadError } = await supabase.storage
    .from('files')
    .upload(filePath, file);
  
  if (uploadError) {
    throw uploadError;
  }
  
  // Get the public URL
  const { data: urlData } = await supabase.storage
    .from('files')
    .getPublicUrl(filePath);
  
  if (!urlData) {
    throw new Error("Failed to get public URL");
  }

  let zipUrl: string | undefined;
  
  // If studentId is provided, process PDF to ZIP
  if (studentId) {
    try {
      console.log("Processing PDF to ZIP for student:", studentId);
      const { zipUrl: newZipUrl } = await processPdfToZip(file, studentId);
      zipUrl = newZipUrl;
      console.log("ZIP URL created:", zipUrl);
    } catch (zipError) {
      console.error("Error processing PDF to ZIP:", zipError);
    }
  }
  
  return { 
    publicUrl: urlData.publicUrl,
    zipUrl
  };
};
