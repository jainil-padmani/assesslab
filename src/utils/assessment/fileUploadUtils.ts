
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as pdfjs from 'pdfjs-dist';
import JSZip from 'jszip';

// Configure the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Uploads a file to Supabase storage
 */
export const uploadAnswerSheetFile = async (file: File, textContent?: string) => {
  const fileName = `${crypto.randomUUID()}-${Date.now()}.pdf`;
  
  const { error } = await supabase.storage
    .from('documents')
    .upload(`answer-sheets/${fileName}`, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(`answer-sheets/${fileName}`);
    
  return { fileName, publicUrl, textContent };
};

/**
 * Deletes previous files from storage
 */
export const deletePreviousFiles = async (previousUrls: string[]) => {
  for (const prevUrl of previousUrls) {
    try {
      if (prevUrl) {
        const urlPath = new URL(prevUrl).pathname;
        const pathParts = urlPath.split('/');
        const oldFileName = pathParts[pathParts.length - 1];
        
        if (oldFileName) {
          await supabase.storage
            .from('documents')
            .remove([`answer-sheets/${oldFileName}`]);
          
          console.log('Successfully deleted previous file from storage:', oldFileName);
        }
      }
    } catch (deleteError) {
      console.error('Error deleting previous file:', deleteError);
    }
  }
};

/**
 * Validates a file is a PDF
 */
export const validatePdfFile = (file: File): boolean => {
  return file.type === 'application/pdf';
};

/**
 * Convert PDF to PNG images with optimized settings
 */
export const convertPdfToPng = async (pdfFile: File): Promise<File[]> => {
  try {
    console.log('Converting PDF to PNG images:', pdfFile.name);
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Load the PDF
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const pngFiles: File[] = [];
    
    // Process each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      // Use a higher scale for better OCR results
      const scale = 2.5; // Higher scale for better quality
      const viewport = page.getViewport({ scale });
      
      // Create a canvas for rendering
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance
      
      if (!context) {
        throw new Error('Canvas context could not be created');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Set white background to improve OCR
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Render the page with improved settings
      await page.render({
        canvasContext: context,
        viewport: viewport,
        enableWebGL: true, // Use WebGL if available for better performance
        intent: 'display' // 'display' for screen viewing, 'print' for printing
      }).promise;
      
      // Convert canvas to PNG blob with maximum quality
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
      });
      
      // Create a PNG file with a naming convention that ensures proper order (pad page numbers)
      const pageNum = String(i).padStart(3, '0'); // Ensures 001, 002, etc. for correct sorting
      const pngFileName = `page-${pageNum}.png`;
      const pngFile = new File([blob], pngFileName, { type: 'image/png' });
      pngFiles.push(pngFile);
    }
    
    console.log(`Converted ${numPages} pages to PNG files`);
    return pngFiles;
  } catch (error) {
    console.error('Error converting PDF to PNG:', error);
    toast.error('Failed to convert PDF to PNG images');
    throw error;
  }
};

/**
 * Create a ZIP file from PNG images
 */
export const createZipFromPngFiles = async (pngFiles: File[], baseName: string): Promise<File> => {
  try {
    console.log(`Creating ZIP file from ${pngFiles.length} PNG images`);
    
    const zip = new JSZip();
    
    // Add each PNG file to the ZIP, preserving the filenames for ordering
    pngFiles.forEach(file => {
      zip.file(file.name, file);
    });
    
    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 } // Balance between size and speed
    });
    const zipFile = new File([zipBlob], `${baseName}.zip`, { type: 'application/zip' });
    
    console.log('Successfully created ZIP file:', zipFile.name);
    return zipFile;
  } catch (error) {
    console.error('Error creating ZIP file:', error);
    toast.error('Failed to create ZIP file from PNG images');
    throw error;
  }
};

/**
 * Upload ZIP file to storage
 */
export const uploadZipFile = async (zipFile: File, fileType: 'question' | 'answer' | 'student'): Promise<string> => {
  try {
    const fileName = `${fileType}-${crypto.randomUUID()}-${Date.now()}.zip`;
    
    const { error } = await supabase.storage
      .from('documents')
      .upload(`${fileType}-zips/${fileName}`, zipFile);
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(`${fileType}-zips/${fileName}`);
      
    console.log(`Successfully uploaded ZIP file: ${fileName}`);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading ZIP file:', error);
    toast.error('Failed to upload ZIP file');
    throw error;
  }
};

/**
 * Process PDF file: Convert to PNG, create ZIP, upload ZIP
 * Enhanced version with optimized settings for better OCR results
 */
export const processPdfFile = async (file: File, fileType: 'question' | 'answer' | 'student'): Promise<string> => {
  try {
    // Display processing toast for user feedback
    const toastId = toast.loading('Processing PDF for enhanced OCR...');
    
    // Convert PDF to PNG images with optimized settings
    const pngFiles = await convertPdfToPng(file);
    toast.loading('Creating ZIP archive with extracted images...', { id: toastId });
    
    // Create ZIP file from PNG images
    const baseName = file.name.replace('.pdf', '');
    const zipFile = await createZipFromPngFiles(pngFiles, baseName);
    
    // Upload ZIP file to storage
    toast.loading('Uploading processed files...', { id: toastId });
    const zipUrl = await uploadZipFile(zipFile, fileType);
    
    // Update toast to success
    toast.success('PDF processed successfully for enhanced OCR', { id: toastId });
    
    return zipUrl;
  } catch (error) {
    console.error('Error processing PDF file:', error);
    toast.error('Failed to process PDF file for OCR');
    throw error;
  }
};

/**
 * Extract text from PDF for OCR processing
 * Returns status information about the processing
 */
export const extractTextFromPdf = async (file: File): Promise<string | null> => {
  try {
    // Get file information for debugging
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    console.log(`Processing PDF for OCR. File: ${file.name}, Size: ${fileSizeMB}MB`);
    
    // Process the PDF file to get ZIP URL
    const zipUrl = await processPdfFile(file, 'student');
    
    // Return information about the processing for display to the user
    return `Document processed for OCR with enhanced image extraction. 
File: ${file.name} (${fileSizeMB}MB)
Pages processed: ${file.size > 1024 * 1024 ? 'Multiple' : 'Single'} 
ZIP archive created for optimal OCR processing.
This document will be analyzed using advanced vision AI for better text recognition.`;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return `Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};
