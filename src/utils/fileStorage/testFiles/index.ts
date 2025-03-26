
// Main file that exports all testFiles utilities
import { fetchTestFiles } from './fetchTestFiles';
import { assignSubjectFilesToTest } from './assignSubjectFilesToTest';
import { copyAndRecord } from './copyAndRecord';
import { verifySourceFiles } from './fileVerification';
import { sanitizeTopic } from './fileExtractors';

export {
  fetchTestFiles,
  assignSubjectFilesToTest,
  copyAndRecord,
  verifySourceFiles,
  sanitizeTopic
};
