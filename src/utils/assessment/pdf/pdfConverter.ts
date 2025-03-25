
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
 * Convert any image to PNG format using canvas
 */
export async function convertImageToPng(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw image with white background to handle transparency
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Convert to PNG
      try {
        const pngDataUrl = canvas.toDataURL('image/png');
        console.log(`Converted image to PNG, data URL length: ${pngDataUrl.length}`);
        resolve(pngDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Converts PDF pages to PNG images and adds them to a ZIP file
 */
export async function convertPdfPagesToZip(pdfFile: File | Blob): Promise<{ 
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
      
      // Convert canvas to PNG image (always use PNG format)
      const pngDataUrl = canvas.toDataURL('image/png');
      console.log(`Created PNG for page ${i}, data URL length: ${pngDataUrl.length}`);
      
      // Convert data URL to blob
      const pngBlob = dataURLToBlob(pngDataUrl);
      
      // Add the PNG to the ZIP with a sequential name
      const paddedPageNum = String(i).padStart(3, '0');
      zip.file(`page_${paddedPageNum}.png`, pngBlob);
      
      console.log(`Added page ${i} as PNG image to ZIP file`);
    }
    
    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    console.log(`Created ZIP file with size: ${zipBlob.size} bytes`);
    
    // Clean up the PDF URL
    URL.revokeObjectURL(pdfUrl);
    
    console.log(`Successfully created ZIP with ${numPages} PNG images`);
    
    return { 
      zipBlob,
      pdfPages: numPages
    };
  } catch (error) {
    console.error("Error converting PDF to ZIP:", error);
    throw error;
  }
}

/**
 * Converts any image file to PNG format and adds it to a ZIP file
 * Used for handling single image uploads
 */
export async function convertImageFileToZip(imageFile: File | Blob): Promise<Blob> {
  try {
    // Create a URL for the image file
    const imageUrl = URL.createObjectURL(imageFile);
    
    // Convert to PNG using canvas
    const pngDataUrl = await convertImageToPng(imageUrl);
    
    // Convert data URL to blob
    const pngBlob = dataURLToBlob(pngDataUrl);
    
    // Create a ZIP file with the PNG
    const zip = new JSZip();
    zip.file("image_001.png", pngBlob);
    
    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    console.log(`Created ZIP file from image, size: ${zipBlob.size} bytes`);
    
    // Clean up the image URL
    URL.revokeObjectURL(imageUrl);
    
    console.log(`Successfully created ZIP with PNG image`);
    
    return zipBlob;
  } catch (error) {
    console.error("Error converting image to ZIP:", error);
    throw error;
  }
}
