
// Export all functions from the new modular files
export { 
  fetchSubjectFiles,
  deleteFileGroup
} from './fileStorage/subjectFileOps';

export {
  assignSubjectFilesToTest,
  fetchTestFiles,
  uploadTestFiles
} from './fileStorage/testFileOps';
