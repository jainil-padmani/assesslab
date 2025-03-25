
import { convertPdfPagesToZip, convertImageFileToZip } from "./pdf/pdfConverter";
import { uploadZipFile } from "./pdf/zipFileStorage";
import { validatePdfFile } from "./fileValidation";

/**
 * Processes a PDF or image file and converts it to PNG images
 * These images are then compressed into a ZIP file for efficient storage and processing
 */
export const processPdfToZip = async (
  file: File, 
  identifier: string, 
  folderType: string = 'answer_sheets'
): Promise<{ zipBlob: Blob, zipUrl: string }> => {
  try {
    let zipBlob: Blob;
    
    // Handle PDF files
    if (validatePdfFile(file)) {
      console.log("Converting PDF to ZIP of PNG images");
      const { zipBlob: pdfZipBlob } = await convertPdfPagesToZip(file);
      zipBlob = pdfZipBlob;
    } 
    // Handle image files
    else if (file.type.startsWith('image/')) {
      console.log("Converting image to PNG and creating ZIP");
      zipBlob = await convertImageFileToZip(file);
    }
    // Handle unsupported file types
    else {
      throw new Error(`Unsupported file type: ${file.type}. Only PDF and image files are supported.`);
    }
    
    // Upload the ZIP file to storage
    const zipUrl = await uploadZipFile(zipBlob, identifier, folderType);
    
    return { 
      zipBlob,
      zipUrl
    };
  } catch (error) {
    console.error("Error processing file to ZIP:", error);
    throw error;
  }
};

// Re-export the downloadZipFile function for backward compatibility
export { downloadZipFile } from "./pdf/zipFileStorage";
