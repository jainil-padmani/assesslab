
/**
 * Validates if a file is PDF
 */
export const validatePdfFile = (file: File | Blob): boolean => {
  if (file instanceof File) {
    const validTypes = ['application/pdf'];
    return validTypes.includes(file.type);
  }
  // For Blobs without type information, we can't validate definitively
  // Return true and let downstream processing handle errors
  return true;
};

/**
 * Validates if a file is an allowed format (PDF, PNG, JPG)
 */
export const validateFileFormat = (file: File): boolean => {
  const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  return validTypes.includes(file.type);
};

/**
 * Extracts file extension from a URL without query parameters
 */
export const getFileExtension = (url: string): string => {
  if (!url) return '';
  
  // Remove any query parameters or cache busters
  const urlWithoutParams = url.split('?')[0];
  // Get the last part after the last dot
  return urlWithoutParams.split('.').pop()?.toLowerCase() || '';
};

/**
 * Validates if a file URL points to a supported format
 */
export const isValidFileFormat = (url: string): boolean => {
  const ext = getFileExtension(url);
  const supportedFormats = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
  return supportedFormats.includes(ext);
};

/**
 * Validates if a URL is accessible and the file can be downloaded
 */
export const isUrlAccessible = async (url: string, timeoutMs = 10000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error(`Error checking URL accessibility (${url}):`, error);
    return false;
  }
};
