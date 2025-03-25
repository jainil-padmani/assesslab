
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

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
 * Convert image to optimized JPEG format using canvas with grayscale and compression
 * for smaller file size and better OCR performance
 */
export async function convertImageToOptimized(imageUrl: string, useGrayscale: boolean = true): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = async () => {
      // Create canvas with lower resolution (75 DPI equivalent)
      // This is approximately 30% of original dimensions
      const scaleFactor = 0.3;
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
      
      // Apply grayscale filter for better OCR performance and smaller file size
      if (useGrayscale) {
        ctx.filter = 'grayscale(100%)';
      }
      
      // Draw image with optimized settings
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Use JPEG with lower quality for best size reduction (65% quality)
      try {
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
        const originalSizeEstimate = img.width * img.height * 4 / 1024; // KB estimate
        const newSizeEstimate = optimizedDataUrl.length * 0.75 / 1024; // KB estimate
        console.log(`Optimized image: ${Math.round(originalSizeEstimate)}KB → ${Math.round(newSizeEstimate)}KB (${Math.round(newSizeEstimate/originalSizeEstimate*100)}%)`);
        
        // Upload the optimized image to storage and return the URL
        try {
          const imageBlob = dataURLToBlob(optimizedDataUrl);
          const fileName = `optimized_${uuidv4()}.jpg`;
          const filePath = `optimized_images/${fileName}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(filePath, imageBlob, {
              contentType: 'image/jpeg',
              cacheControl: 'max-age=3600'
            });
            
          if (uploadError) {
            console.error("Error uploading optimized image:", uploadError);
            // Fall back to data URL if upload fails
            resolve(optimizedDataUrl);
            return;
          }
          
          const { data: urlData } = await supabase.storage
            .from('files')
            .getPublicUrl(filePath);
            
          if (!urlData || !urlData.publicUrl) {
            console.error("Failed to get public URL for optimized image");
            // Fall back to data URL if getting URL fails
            resolve(optimizedDataUrl);
            return;
          }
          
          console.log(`Uploaded optimized image: ${urlData.publicUrl}`);
          resolve(urlData.publicUrl);
        } catch (uploadErr) {
          console.error("Error in image upload process:", uploadErr);
          // Fall back to data URL if process fails
          resolve(optimizedDataUrl);
        }
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
 * Convert an image file to optimized format
 * Returns the URL of the optimized image
 */
export async function convertImageFileToOptimized(imageFile: File | Blob): Promise<string> {
  try {
    // Create a URL for the image file
    const imageUrl = URL.createObjectURL(imageFile);
    
    // Convert to optimized image using canvas
    const useGrayscale = true; // Use grayscale for better OCR
    const optimizedImageUrl = await convertImageToOptimized(imageUrl, useGrayscale);
    
    // Clean up the URL
    URL.revokeObjectURL(imageUrl);
    
    console.log(`Successfully created optimized image from file`);
    
    return optimizedImageUrl;
  } catch (error) {
    console.error("Error converting image to optimized format:", error);
    throw error;
  }
}

/**
 * Converts PDF pages to optimized JPEG images
 * Returns URLs for direct OpenAI processing (batch of 4 max)
 */
export async function convertPdfPagesToImages(pdfFile: File | Blob): Promise<string[]> {
  try {
    // Create a URL for the PDF file
    const pdfUrl = URL.createObjectURL(pdfFile);
    
    // Load the PDF.js library dynamically
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    // Load the PDF document
    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    const numPages = pdfDoc.numPages;
    
    // Limit to processing only first 4 pages for performance
    const pagesToProcess = Math.min(numPages, 4);
    console.log(`Processing PDF with ${numPages} pages (using first ${pagesToProcess} pages for OCR)`);
    
    // Always use grayscale for better OCR performance and smaller size
    const useGrayscale = true;
    
    // Store the image URLs
    const imageUrls: string[] = [];
    
    // Process each page (maximum 4)
    for (let i = 1; i <= pagesToProcess; i++) {
      // Get the page
      const page = await pdfDoc.getPage(i);
      
      // Set scale for lower resolution (75 DPI instead of 300 DPI)
      // This is approximately 0.75 scale factor
      const scale = 0.75;
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
      
      // Apply grayscale filter for better OCR
      if (useGrayscale) {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let j = 0; j < data.length; j += 4) {
          const avg = (data[j] + data[j + 1] + data[j + 2]) / 3;
          data[j] = data[j + 1] = data[j + 2] = avg;
        }
        
        context.putImageData(imageData, 0, 0);
      }
      
      // Convert canvas to optimized JPEG image with higher compression
      // Using a lower quality (0.65) for better file size reduction
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.65);
      
      // Upload the optimized image to storage
      try {
        const imageBlob = dataURLToBlob(imageDataUrl);
        const fileName = `pdf_page_${i}_${uuidv4()}.jpg`;
        const filePath = `optimized_pdf_pages/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, imageBlob, {
            contentType: 'image/jpeg',
            cacheControl: 'max-age=3600'
          });
          
        if (uploadError) {
          console.error(`Error uploading page ${i}:`, uploadError);
          // Fall back to data URL if upload fails
          imageUrls.push(imageDataUrl);
          continue;
        }
        
        const { data: urlData } = await supabase.storage
          .from('files')
          .getPublicUrl(filePath);
          
        if (!urlData || !urlData.publicUrl) {
          console.error(`Failed to get public URL for page ${i}`);
          // Fall back to data URL if getting URL fails
          imageUrls.push(imageDataUrl);
          continue;
        }
        
        console.log(`Uploaded PDF page ${i} as optimized JPEG: ${urlData.publicUrl}`);
        imageUrls.push(urlData.publicUrl);
      } catch (uploadErr) {
        console.error(`Error in upload process for page ${i}:`, uploadErr);
        // Fall back to data URL if process fails
        imageUrls.push(imageDataUrl);
      }
      
      console.log(`Processed page ${i} of ${pagesToProcess}`);
    }
    
    // Clean up the PDF URL
    URL.revokeObjectURL(pdfUrl);
    
    console.log(`Successfully created ${imageUrls.length} optimized images from PDF`);
    
    return imageUrls;
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw error;
  }
}
