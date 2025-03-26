
// Export all functions from the new modular files
export { 
  fetchSubjectFiles,
  deleteFileGroup,
  uploadSubjectFile
} from './fileStorage/subjectFileOps';

export {
  assignSubjectFilesToTest,
  fetchTestFiles
} from './fileStorage/testFileOps';
