
/**
 * Validates if a file is PDF
 */
export const validatePdfFile = (file: File): boolean => {
  const validTypes = ['application/pdf'];
  return validTypes.includes(file.type);
};
