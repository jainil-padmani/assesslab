
import { validatePdfFile } from "../fileValidation";
import { processPdfToImages } from "../pdfProcessingUtils";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Uploads a PDF file and processes it to optimized JPEG images if needed
 * 
 * @param file - The PDF file to upload
 * @param studentId - Optional student ID for answer sheets
 * @param folderPath - The folder path to store the file (default: 'answer_sheets')
 */
export const uploadPdfFile = async (
  file: File, 
  studentId?: string, 
  folderPath: string = 'answer_sheets'
): Promise<{ publicUrl: string, zipUrl?: string }> => {
  if (!validatePdfFile(file)) {
    throw new Error("Invalid file type. Only PDF files are allowed.");
  }

  // Generate a unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;
  
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
  
  // Process PDF to optimized JPEG images for better OCR processing
  try {
    console.log(`Processing PDF to optimized JPEG images for ${folderPath}`);
    const fileIdentifier = studentId || uuidv4();
    const { imageUrls } = await processPdfToImages(file, fileIdentifier, folderPath);
    zipUrl = imageUrls.length > 0 ? imageUrls[0] : undefined;
    console.log("Image URL created:", zipUrl);
  } catch (processError) {
    console.error("Error processing PDF to optimized images:", processError);
  }
  
  return { 
    publicUrl: urlData.publicUrl,
    zipUrl
  };
};
