
/**
 * Validates if a file is PDF
 */
export const validatePdfFile = (file: File): boolean => {
  const validTypes = ['application/pdf'];
  return validTypes.includes(file.type);
};

/**
 * Validates if a file is an allowed format (PDF, PNG, JPG)
 */
export const validateFileFormat = (file: File): boolean => {
  const validTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  return validTypes.includes(file.type);
};

/**
 * Extracts file extension from a URL without query parameters
 */
export const getFileExtension = (url: string): string => {
  if (!url) return '';
  
  // Remove any query parameters
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
