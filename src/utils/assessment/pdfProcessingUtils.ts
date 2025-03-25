
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
    console.log(`Downloading file from URL: ${url}`);
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`Successfully downloaded file, size: ${blob.size} bytes, type: ${blob.type}`);
    return blob;
  } catch (error) {
    console.error("Error downloading file:", error);
    throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Determines if a file is an image based on MIME type or URL extension
 */
const isImageFile = (file: File | Blob | string): boolean => {
  if (typeof file === 'string') {
    return /\.(jpg|jpeg|png|gif|webp|bmp|tiff|tif)$/i.test(file);
  } else if (file instanceof File) {
    return file.type.startsWith('image/');
  } else if (file instanceof Blob) {
    return file.type.startsWith('image/');
  }
  return false;
};

/**
 * Determines if a file is a PDF based on MIME type or URL extension
 */
const isPdfFile = (file: File | Blob | string): boolean => {
  if (typeof file === 'string') {
    return file.toLowerCase().endsWith('.pdf');
  } else if (file instanceof File) {
    return file.type === 'application/pdf';
  } else if (file instanceof Blob) {
    return file.type === 'application/pdf';
  }
  return false;
};

/**
 * Processes a PDF or image file and converts it to PNG images
 * These high-quality PNG images are then compressed into a ZIP file for OpenAI processing
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
      
      // Determine file type and process accordingly
      if (isPdfFile(file) || fileBlob.type === 'application/pdf') {
        console.log("Converting downloaded PDF to high-quality PNG images and creating ZIP");
        const { zipBlob: pdfZipBlob } = await convertPdfPagesToZip(fileBlob);
        zipBlob = pdfZipBlob;
      } else if (isImageFile(file) || fileBlob.type.startsWith('image/')) {
        console.log("Converting downloaded image to high-quality PNG and creating ZIP");
        zipBlob = await convertImageFileToZip(fileBlob);
      } else {
        throw new Error(`Unsupported file type from URL: ${file}. Only PDF and image files are supported.`);
      }
    } else if (file instanceof File) {
      console.log(`Processing File object: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      if (validatePdfFile(file) || file.type === 'application/pdf') {
        console.log("Converting PDF to high-quality PNG images and creating ZIP");
        const { zipBlob: pdfZipBlob } = await convertPdfPagesToZip(file);
        zipBlob = pdfZipBlob;
      } else if (file.type.startsWith('image/')) {
        console.log(`Converting image (${file.type}) to high-quality PNG and creating ZIP`);
        zipBlob = await convertImageFileToZip(file);
      } else {
        throw new Error(`Unsupported file type: ${file.type}. Only PDF and image files are supported.`);
      }
    } else if (file instanceof Blob) {
      // For Blob case, check MIME type if available
      const fileType = file.type || '';
      console.log(`Processing Blob with type: ${fileType}, size: ${file.size} bytes`);
      
      if (fileType === 'application/pdf' || isPdfFile(file)) {
        console.log("Converting PDF blob to high-quality PNG images and creating ZIP");
        const { zipBlob: pdfZipBlob } = await convertPdfPagesToZip(file);
        zipBlob = pdfZipBlob;
      } else if (fileType.startsWith('image/') || isImageFile(file)) {
        console.log("Converting image blob to high-quality PNG and creating ZIP");
        zipBlob = await convertImageFileToZip(file);
      } else {
        // Assume PDF if no type information
        console.log("No MIME type, assuming PDF and converting to PNG images");
        const { zipBlob: pdfZipBlob } = await convertPdfPagesToZip(file);
        zipBlob = pdfZipBlob;
      }
    } else {
      throw new Error("Unsupported input type. Expected URL string, File, or Blob.");
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
    console.log(`Processed file to ZIP of high-quality PNGs and uploaded at: ${zipUrl}`);
    
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
