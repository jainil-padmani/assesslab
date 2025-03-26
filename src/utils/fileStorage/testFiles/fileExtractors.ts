
/**
 * Utility functions for extracting file information
 */

/**
 * Extracts filename from a URL
 * 
 * @param url The URL to extract filename from
 * @returns The extracted filename
 */
export const extractFilenameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    // Get the last part of the path which should be the filename
    const fileName = pathParts[pathParts.length - 1];
    // URL decode it to handle spaces and special characters
    return decodeURIComponent(fileName);
  } catch (e) {
    console.error("Failed to extract filename from URL:", url, e);
    throw new Error("Invalid file URL format");
  }
};

/**
 * Determines file extension from a filename
 * 
 * @param filename The filename to get extension from
 * @returns The file extension
 */
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : 'pdf';
};

/**
 * Sanitizes a topic name for use in filenames
 * 
 * @param topic The topic to sanitize
 * @returns Sanitized topic string
 */
export const sanitizeTopic = (topic: string): string => {
  return topic.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
};
