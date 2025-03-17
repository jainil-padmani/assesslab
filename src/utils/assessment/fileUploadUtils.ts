
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

// Set the PDF.js worker source path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Upload a file to Supabase storage
 * @param file The file to upload
 * @param path The path in the bucket to store the file
 * @returns The public URL of the uploaded file
 */
export const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
  try {
    const { data, error } = await supabase.storage
      .from("answer-sheets")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    // Get the public URL for the file
    const { data: publicUrlData } = supabase.storage
      .from("answer-sheets")
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    toast.error("Failed to upload file. Please try again.");
    throw error;
  }
};

/**
 * Convert a PDF file to a ZIP containing PNGs for better OCR
 * @param pdfFile The PDF file to convert
 * @returns A ZIP file containing PNG images for each page
 */
export const convertPdfToZip = async (pdfFile: File): Promise<File> => {
  try {
    // Create a new JSZip instance
    const zip = new JSZip();
    
    // Load the PDF file
    const pdfData = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    
    const totalPages = pdf.numPages;
    console.log(`PDF has ${totalPages} pages`);
    
    // For each page in the PDF
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      
      // Scale the page for better OCR results
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create a canvas to render the page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Failed to get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render the page to the canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
        // Remove the enableWebGL property as it's not supported in the type definition
      }).promise;
      
      // Convert the canvas to a PNG
      const pngBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(new Blob([]));
        }, 'image/png');
      });
      
      // Add the PNG to the ZIP file
      zip.file(`page-${i}.png`, pngBlob);
    }
    
    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Create a File from the Blob
    const zipFile = new File([zipBlob], `${pdfFile.name.replace(/\.[^/.]+$/, '')}.zip`, { 
      type: 'application/zip' 
    });
    
    return zipFile;
  } catch (error) {
    console.error('Error converting PDF to ZIP:', error);
    toast.error('Failed to convert PDF for OCR processing. Please try again.');
    throw error;
  }
};

/**
 * Extract text from a PDF file using PDF.js
 * @param pdfFile The PDF file to extract text from
 * @returns The extracted text
 */
export const extractTextFromPdf = async (pdfFile: File): Promise<string> => {
  try {
    const pdfData = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    
    let extractedText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map(item => 'str' in item ? item.str : '')
        .join(' ');
        
      extractedText += pageText + '\n\n';
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return 'Failed to extract text from PDF. Please try processing with OCR instead.';
  }
};

/**
 * Upload an answer sheet and check for OCR processing
 */
export const uploadAnswerSheet = async (
  file: File,
  studentId: string,
  subjectId: string,
  testId?: string
): Promise<{ url: string; zipUrl?: string; textContent?: string }> => {
  try {
    // Create a unique path for the file
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${studentId}/${fileName}`;
    
    // Upload the original file
    const fileUrl = await uploadFileToStorage(file, filePath);
    
    // For PDFs, create a ZIP with PNG images for better OCR
    let zipUrl: string | undefined;
    let textContent: string | undefined;
    
    if (file.type === 'application/pdf') {
      try {
        // Extract basic text from PDF
        textContent = await extractTextFromPdf(file);
        
        // Convert PDF to ZIP for OCR processing
        const zipFile = await convertPdfToZip(file);
        const zipPath = `${studentId}/${timestamp}-${file.name.replace(/\.[^/.]+$/, '')}.zip`;
        zipUrl = await uploadFileToStorage(zipFile, zipPath);
        
        console.log('PDF converted to ZIP for OCR:', zipUrl);
      } catch (conversionError) {
        console.error('Error in PDF conversion:', conversionError);
        // Continue with just the PDF if conversion fails
      }
    }
    
    return {
      url: fileUrl,
      zipUrl,
      textContent,
    };
  } catch (error) {
    console.error('Error in uploadAnswerSheet:', error);
    toast.error('Failed to upload answer sheet. Please try again.');
    throw error;
  }
};
