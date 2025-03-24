
import { useEffect } from 'react';
import { ensureAssessmentColumnsExist } from '@/utils/assessment/migrations';

export function AssessmentMigrations() {
  useEffect(() => {
    const runMigrations = async () => {
      try {
        await ensureAssessmentColumnsExist();
      } catch (error) {
        console.error("Failed to run assessment migrations:", error);
      }
    };
    
    runMigrations();
  }, []);
  
  return null; // This component doesn't render anything
}
