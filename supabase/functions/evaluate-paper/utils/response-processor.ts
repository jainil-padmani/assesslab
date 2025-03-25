
/**
 * Utilities for processing API responses
 */

/**
 * Extract text content from Bedrock/Claude API response
 */
export function extractTextFromResponse(response: any): string {
  if (!response) {
    console.error("Empty response from Bedrock API");
    throw new Error("Empty response from Bedrock API");
  }
  
  console.log("Full Bedrock response:", JSON.stringify(response).substring(0, 500) + "...");
  
  // Handle different response formats from Bedrock API
  let textContent = "";
  
  // Check for Claude format
  if (response.output && response.output.content) {
    const contents = response.output.content;
    
    if (Array.isArray(contents)) {
      // Find the text content in the array
      for (const item of contents) {
        if (item.type === "text") {
          textContent = item.text;
          break;
        }
      }
    } else if (typeof contents === "string") {
      textContent = contents;
    }
  } 
  // Alternative format - directly in content
  else if (response.content) {
    if (Array.isArray(response.content)) {
      for (const item of response.content) {
        if (item.type === "text") {
          textContent = item.text;
          break;
        }
      }
    } else if (typeof response.content === "string") {
      textContent = response.content;
    }
  }
  // Try completion format
  else if (response.completion) {
    textContent = response.completion;
  }
  // Try message format
  else if (response.message && response.message.content) {
    textContent = typeof response.message.content === "string" 
      ? response.message.content
      : JSON.stringify(response.message.content);
  }
  
  if (!textContent) {
    console.error("Could not extract text content from response format:", JSON.stringify(response));
    throw new Error("Could not extract text from Bedrock API response");
  }
  
  console.log(`Successfully extracted text: ${textContent.substring(0, 100)}...`);
  return textContent;
}
