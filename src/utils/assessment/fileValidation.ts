
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
