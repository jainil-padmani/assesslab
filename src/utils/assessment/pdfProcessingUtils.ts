
import { convertPdfPagesToZip } from "./pdf/pdfConverter";
import { uploadZipFile } from "./pdf/zipFileStorage";

/**
 * Processes a PDF file and converts each page into a PNG image
 * These images are then compressed into a ZIP file for efficient storage and processing
 */
export const processPdfToZip = async (pdfFile: File, studentId: string): Promise<{ zipBlob: Blob, zipUrl: string }> => {
  try {
    // Convert PDF pages to PNG images and add to ZIP
    const { zipBlob } = await convertPdfPagesToZip(pdfFile);
    
    // Upload the ZIP file to storage
    const zipUrl = await uploadZipFile(zipBlob, studentId);
    
    return { 
      zipBlob,
      zipUrl
    };
  } catch (error) {
    console.error("Error processing PDF to ZIP:", error);
    throw error;
  }
};

// Re-export the downloadZipFile function for backward compatibility
export { downloadZipFile } from "./pdf/zipFileStorage";
