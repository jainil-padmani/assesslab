
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";

/**
 * Helper function to convert a data URL to a Blob object
 */
export function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Converts PDF pages to PNG images and adds them to a ZIP file
 */
export async function convertPdfPagesToZip(pdfFile: File): Promise<{ 
  zipBlob: Blob, 
  pdfPages: number
}> {
  try {
    // Create a URL for the PDF file
    const pdfUrl = URL.createObjectURL(pdfFile);
    
    // Create a new ZIP file
    const zip = new JSZip();
    
    // Load the PDF.js library dynamically
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    // Load the PDF document
    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    const numPages = pdfDoc.numPages;
    
    console.log(`Processing PDF with ${numPages} pages`);
    
    // Process each page
    for (let i = 1; i <= numPages; i++) {
      // Get the page
      const page = await pdfDoc.getPage(i);
      
      // Set scale for better image quality (higher scale = better quality but larger file size)
      const scale = 2.0;
      const viewport = page.getViewport({ scale });
      
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Canvas context not available');
      }
      
      // Set canvas dimensions to match the page
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render the page to the canvas
      await page.render({
        canvasContext: context,
        viewport
      }).promise;
      
      // Convert canvas to PNG image
      const pngDataUrl = canvas.toDataURL('image/png');
      
      // Convert data URL to blob
      const pngBlob = dataURLToBlob(pngDataUrl);
      
      // Add the PNG to the ZIP with a sequential name
      const paddedPageNum = String(i).padStart(3, '0');
      zip.file(`page_${paddedPageNum}.png`, pngBlob);
    }
    
    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Clean up the PDF URL
    URL.revokeObjectURL(pdfUrl);
    
    return { 
      zipBlob,
      pdfPages: numPages
    };
  } catch (error) {
    console.error("Error converting PDF to ZIP:", error);
    throw error;
  }
}
