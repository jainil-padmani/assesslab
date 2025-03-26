
// Export all functions from the refactored files
export { fetchTestFiles } from './fetchTestFiles';
export { assignSubjectFilesToTest } from './assignSubjectFilesToTest';
export { copyAndRecord } from './copyAndRecord';
export { verifySourceFiles, verifyTestAndSubjectFile } from './fileVerification';
export {
  extractFilenameFromUrl,
  getFileExtension,
  sanitizeTopic
} from './fileExtractors';
