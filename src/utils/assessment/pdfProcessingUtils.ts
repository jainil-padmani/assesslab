
import { convertPdfPagesToZip, convertImageFileToZip } from "./pdf/pdfConverter";
import { uploadZipFile } from "./pdf/zipFileStorage";
import { validatePdfFile } from "./fileValidation";

// Increased timeout for PDF operations (5 minutes in milliseconds)
const PDF_PROCESSING_TIMEOUT = 5 * 60 * 1000;

/**
 * Custom fetch function with timeout for large files
 */
const fetchWithTimeout = async (url: string, timeoutMs = PDF_PROCESSING_TIMEOUT): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      cache: 'no-store' // Prevent caching issues
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Download a PDF file from a URL with extended timeout
 */
export const downloadPdfFromUrl = async (url: string): Promise<Blob> => {
  try {
    console.log(`Downloading PDF from URL: ${url}`);
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`Successfully downloaded PDF, size: ${blob.size} bytes`);
    return blob;
  } catch (error) {
    console.error("Error downloading PDF:", error);
    throw new Error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Processes a PDF or image file and converts it to PNG images
 * These images are then compressed into a ZIP file for efficient storage and OpenAI processing
 * Now with improved timeout handling for large files
 */
export const processPdfToZip = async (
  file: File | Blob | string, 
  identifier: string, 
  folderType: string = 'answer_sheets'
): Promise<{ zipBlob: Blob, zipUrl: string }> => {
  try {
    let fileBlob: Blob;
    let zipBlob: Blob;
    console.log("Starting processPdfToZip with identifier:", identifier);
    
    // Handle different input types
    if (typeof file === 'string') {
      // If file is a URL, download it with extended timeout
      console.log(`Downloading file from URL: ${file}`);
      fileBlob = await downloadPdfFromUrl(file);
      
      // Determine file type from content-type or URL extension
      const isPdf = file.toLowerCase().endsWith('.pdf');
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
      
      if (isPdf) {
        console.log("Converting downloaded PDF to PNG images and creating ZIP");
        const { zipBlob: pdfZipBlob } = await convertPdfPagesToZip(fileBlob);
        zipBlob = pdfZipBlob;
      } else if (isImage) {
        console.log("Converting downloaded image to PNG and creating ZIP");
        zipBlob = await convertImageFileToZip(fileBlob);
      } else {
        throw new Error(`Unsupported file type from URL: ${file}. Only PDF and image files are supported.`);
      }
    } else if (file instanceof File) {
      console.log(`Processing File object: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      if (validatePdfFile(file)) {
        console.log("Converting PDF to PNG images and creating ZIP");
        const { zipBlob: pdfZipBlob } = await convertPdfPagesToZip(file);
        zipBlob = pdfZipBlob;
      } else if (file.type.startsWith('image/')) {
        console.log(`Converting image (${file.type}) to PNG and creating ZIP`);
        zipBlob = await convertImageFileToZip(file);
      } else {
        throw new Error(`Unsupported file type: ${file.type}. Only PDF and image files are supported.`);
      }
    } else {
      // Blob case - assume PDF if no type information
      console.log("Processing blob and converting to ZIP of PNG images");
      const { zipBlob: pdfZipBlob } = await convertPdfPagesToZip(file);
      zipBlob = pdfZipBlob;
    }
    
    // Upload the ZIP file to storage with retry mechanism
    const uploadWithRetry = async (retries = 3, delay = 2000): Promise<string> => {
      try {
        return await uploadZipFile(zipBlob, identifier, folderType);
      } catch (error) {
        if (retries <= 0) throw error;
        console.log(`Upload failed, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return uploadWithRetry(retries - 1, delay * 1.5);
      }
    };
    
    const zipUrl = await uploadWithRetry();
    console.log(`Processed file to ZIP and uploaded at: ${zipUrl}`);
    
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
