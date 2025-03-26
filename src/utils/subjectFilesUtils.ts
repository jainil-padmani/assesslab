
// Export all functions from the new modular files
export { 
  fetchSubjectFiles,
  deleteFileGroup,
  uploadSubjectFile
} from './fileStorage/subjectFileOps';

// Update imports to use the reorganized structure
export {
  fetchTestFiles,
  assignSubjectFilesToTest
} from './fileStorage/testFiles';
