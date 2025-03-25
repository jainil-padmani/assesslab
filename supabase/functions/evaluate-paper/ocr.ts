
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';

// Export functions from the extractors
export { extractTextFromFile } from "./extractors/file-extractor.ts";
export { extractTextFromImageFile } from "./extractors/file-extractor.ts";
// Still export the function but it's a no-op now
export { extractTextFromZip } from "./extractors/zip-extractor.ts";
export { extractQuestionsFromPaper, extractQuestionsFromText } from "./extractors/question-extractor.ts";
export { matchAnswersToQuestions } from "./extractors/answer-matcher.ts";
export { evaluateWithExtractedQuestions } from "./extractors/answer-evaluator.ts";

// Re-export utility functions that might be needed elsewhere
export { createOpenAIService } from "./services/openai-service.ts";
export { createDirectImageUrl, cleanUrlForApi } from "./utils/image-processing.ts";
