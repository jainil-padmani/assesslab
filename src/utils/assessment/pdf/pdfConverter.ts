
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
 * Convert image to optimized format (JPEG or WebP) using canvas with lower resolution
 * and compression settings to reduce file size
 */
export async function convertImageToOptimized(imageUrl: string, useGrayscale: boolean = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      // Create canvas with lower resolution (100 DPI equivalent)
      // This is approximately 40% of original dimensions for standard displays
      const scaleFactor = 0.4;
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scaleFactor;
      canvas.height = img.height * scaleFactor;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw white background to handle transparency
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Apply grayscale filter if requested
      if (useGrayscale) {
        ctx.filter = 'grayscale(100%)';
      }
      
      // Draw image with optimized settings
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Use JPEG for best size reduction (quality 0.8)
      // Good balance between size and quality
      try {
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const originalSizeEstimate = img.width * img.height * 4 / 1024; // KB estimate
        const newSizeEstimate = optimizedDataUrl.length * 0.75 / 1024; // KB estimate
        console.log(`Optimized image: ${Math.round(originalSizeEstimate)}KB → ${Math.round(newSizeEstimate)}KB (${Math.round(newSizeEstimate/originalSizeEstimate*100)}%)`);
        resolve(optimizedDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    
    // Add cache-busting parameter to avoid caching issues
    const cacheBuster = imageUrl.includes('?') ? `&cache=${Date.now()}` : `?cache=${Date.now()}`;
    img.src = imageUrl + cacheBuster;
  });
}

/**
 * Converts PDF pages to optimized images and adds them to a ZIP file
 * Optimized for smaller file sizes while maintaining readability
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
    
    console.log(`Processing PDF with ${numPages} pages for optimized conversion`);
    
    // Check if color is needed (assume grayscale is sufficient for most papers)
    // You can adjust this heuristic based on your specific use case
    const useGrayscale = true;
    
    // Process each page
    for (let i = 1; i <= numPages; i++) {
      // Get the page
      const page = await pdfDoc.getPage(i);
      
      // Set scale for lower resolution (100 DPI instead of 300 DPI)
      // This is approximately 1.0 scale factor
      const scale = 1.0;
      const viewport = page.getViewport({ scale });
      
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!context) {
        throw new Error('Canvas context not available');
      }
      
      // Set canvas dimensions to match the scaled page
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render the page to the canvas
      await page.render({
        canvasContext: context,
        viewport
      }).promise;
      
      // Convert canvas to optimized JPEG image with compression
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Convert data URL to blob
      const imageBlob = dataURLToBlob(imageDataUrl);
      
      // Add the image to the ZIP with a sequential name
      const paddedPageNum = String(i).padStart(3, '0');
      zip.file(`page_${paddedPageNum}.jpg`, imageBlob);
      
      console.log(`Added page ${i} as optimized JPEG image to ZIP file (size: ${Math.round(imageBlob.size/1024)}KB)`);
    }
    
    // Generate the ZIP file with maximum compression
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 } // Maximum compression
    });
    console.log(`Created ZIP file with size: ${Math.round(zipBlob.size/1024)}KB (${Math.round(zipBlob.size/1048576)} MB)`);
    
    // Check if the ZIP file is too large (>5MB)
    if (zipBlob.size > 5 * 1024 * 1024) {
      console.warn(`ZIP file size (${Math.round(zipBlob.size/1048576)} MB) exceeds 5MB target. Consider further optimizations.`);
    }
    
    // Clean up the PDF URL
    URL.revokeObjectURL(pdfUrl);
    
    console.log(`Successfully created optimized ZIP with ${numPages} images`);
    
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
 * Converts any image file to optimized format and adds it to a ZIP file
 * Enhanced for smaller file sizes
 */
export async function convertImageFileToZip(imageFile: File | Blob): Promise<Blob> {
  try {
    // Create a URL for the image file
    const imageUrl = URL.createObjectURL(imageFile);
    
    // Convert to optimized image using canvas
    const useGrayscale = true; // Use grayscale for better compression
    const optimizedDataUrl = await convertImageToOptimized(imageUrl, useGrayscale);
    
    // Convert data URL to blob
    const optimizedBlob = dataURLToBlob(optimizedDataUrl);
    
    // Create a ZIP file with the optimized image
    const zip = new JSZip();
    zip.file("image_001.jpg", optimizedBlob);
    
    // Generate ZIP file with maximum compression
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 } // Maximum compression
    });
    console.log(`Created ZIP file from image, size: ${Math.round(zipBlob.size/1024)}KB (${Math.round(zipBlob.size/1048576)}MB)`);
    
    // Clean up the image URL
    URL.revokeObjectURL(imageUrl);
    
    console.log(`Successfully created optimized ZIP file from image`);
    
    return zipBlob;
  } catch (error) {
    console.error("Error converting image to ZIP:", error);
    throw error;
  }
}
