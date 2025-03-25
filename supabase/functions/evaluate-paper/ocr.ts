import { Configuration, OpenAIApi } from "https://cdn.skypack.dev/openai@3.2.1";
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts';

// Function to initialize OpenAI API
function initializeOpenAI(apiKey: string) {
  const configuration = new Configuration({
    apiKey: apiKey,
  });
  return new OpenAIApi(configuration);
}

/**
 * Extract text from a file using OpenAI Vision API
 */
export async function extractTextFromFile(fileUrl: string, apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    console.log(`Extracting text from file: ${fileUrl}`);
    const openai = initializeOpenAI(apiKey);

    const response = await openai.createChatCompletion({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all the text from this document." },
            {
              type: "image_url",
              image_url: {
                url: fileUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const extractedText = response.data.choices[0].message?.content || '';
    console.log(`Extracted text: ${extractedText.length} characters`);
    return extractedText;
  } catch (error: any) {
    console.error("Error extracting text from file:", error);
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
}

/**
 * Process images with OpenAI Vision API
 */
async function processImagesWithOpenAI(imageContents: any[], apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    const openai = initializeOpenAI(apiKey);
    
    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: imageContents,
      }
    ];
    
    const response = await openai.createChatCompletion({
      model: "gpt-4-vision-preview",
      messages: messages,
      max_tokens: 2000,
    });
    
    const extractedText = response.data.choices[0].message?.content || '';
    return extractedText;
  } catch (error: any) {
    console.error("Error processing images with OpenAI:", error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

/**
 * Extract text from a ZIP file containing images
 * This function tries to handle OpenAI's limitation by processing each image as PNG
 */
export async function extractTextFromZip(zipUrl: string, apiKey: string, systemPrompt: string = ''): Promise<string> {
  try {
    console.log(`Extracting text from ZIP file: ${zipUrl}`);
    
    // Add cache-busting parameter to prevent caching issues
    const urlWithCacheBuster = zipUrl.includes('?') 
      ? `${zipUrl}&nocache=${Date.now()}` 
      : `${zipUrl}?nocache=${Date.now()}`;
      
    // Download the ZIP file
    console.log(`Downloading ZIP from: ${urlWithCacheBuster}`);
    const zipResponse = await fetch(urlWithCacheBuster, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!zipResponse.ok) {
      throw new Error(`Failed to download ZIP: ${zipResponse.status} ${zipResponse.statusText}`);
    }
    
    const zipArrayBuffer = await zipResponse.arrayBuffer();
    
    // Use JSZip to extract images from the ZIP
    const jszip = await import('jszip');
    const JSZip = jszip.default;
    
    const zip = await JSZip.loadAsync(zipArrayBuffer);
    
    // Get all the image files from the ZIP
    const imageFiles = Object.keys(zip.files).filter(fileName => 
      !zip.files[fileName].dir && /\.(png|jpe?g|gif|webp)$/i.test(fileName)
    );
    
    console.log(`Found ${imageFiles.length} image files in ZIP`);
    
    if (imageFiles.length === 0) {
      throw new Error("No valid image files found in the ZIP archive");
    }
    
    // Sort image files by name to maintain correct order
    imageFiles.sort();
    
    // Process images in batches to avoid hitting OpenAI API limits
    const BATCH_SIZE = 4; // Process 4 images at a time
    const batches = [];
    
    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      batches.push(imageFiles.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Processing images in ${batches.length} batches`);
    
    // Process each batch of images
    const batchTexts: string[] = [];
    
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      console.log(`Processing batch ${batchIdx + 1}/${batches.length} with ${batch.length} images`);
      
      // Convert each image to data URL for the OpenAI API
      const imageContents: { type: string, image_url: { url: string } }[] = [];
      
      for (const imageFile of batch) {
        // Get the image data
        const imageData = await zip.files[imageFile].async('blob');
        
        // Ensure the image is a PNG (OpenAI requires PNG, JPEG, GIF, or WEBP)
        // Even if the filename says it's a PNG, let's convert it just to be sure
        const pngDataUrl = await ensurePngFormat(imageData);
        
        // Add image to the batch
        imageContents.push({
          type: "image_url",
          image_url: {
            url: pngDataUrl
          }
        });
      }
      
      // Add text prompt to explain what we want to extract
      imageContents.push({
        type: "text",
        text: "Extract all the text from these images. Preserve the formatting, paragraphs, bullet points, and numerical listings as much as possible."
      });
      
      // Call OpenAI API to process the batch
      try {
        const batchText = await processImagesWithOpenAI(imageContents, apiKey, systemPrompt);
        batchTexts.push(batchText);
        console.log(`Successfully extracted text from batch ${batchIdx + 1}`);
      } catch (error) {
        console.error(`Error processing batch ${batchIdx + 1}:`, error);
        throw error;
      }
    }
    
    // Combine all the extracted text
    const fullText = batchTexts.join('\n\n');
    console.log(`Successfully extracted full text from ZIP (${fullText.length} characters)`);
    
    return fullText;
  } catch (error) {
    console.error("Error extracting text from ZIP:", error);
    throw error;
  }
}

/**
 * Helper function to ensure an image is in PNG format
 * Converts any image to PNG using canvas
 */
async function ensurePngFormat(imageBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create image URL
    const imageUrl = URL.createObjectURL(imageBlob);
    
    // Create an image element to load the blob
    const img = new Image();
    img.onload = () => {
      // Create canvas to convert the image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image on the canvas (with white background)
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Fill with white background first (in case of transparent images)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the image
      ctx.drawImage(img, 0, 0);
      
      // Convert to PNG data URL
      const pngDataUrl = canvas.toDataURL('image/png');
      
      // Clean up
      URL.revokeObjectURL(imageUrl);
      
      resolve(pngDataUrl);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Failed to load image for PNG conversion'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Extracts structured questions from a paper using OpenAI
 */
export async function extractQuestionsFromPaper(fileUrl: string, apiKey: string, extractedText: string): Promise<{ questions: any[] }> {
  try {
    console.log(`Extracting structured questions from paper: ${fileUrl}`);
    const openai = initializeOpenAI(apiKey);

    const systemPrompt = `You are an expert AI assistant specialized in extracting structured questions from question papers. Your goal is to identify and extract each question, along with its associated details, and format the output as a JSON array.

Instructions:
1.  Carefully analyze the provided text to identify individual questions.
2.  For each question, extract the following information:
    *   questionText: The complete text of the question.
    *   topic: The primary topic or subject area the question belongs to.
    *   difficulty: An estimated difficulty level of the question (Easy, Medium, or Hard).
    *   marks: The marks allocated to the question.
3.  Ensure that the extracted information is accurate and reflects the content of the question paper.
4.  Format the output as a JSON array of question objects.

Output Format:
\`\`\`json
[
    {
        "questionText": "<question text>",
        "topic": "<topic name>",
        "difficulty": "<Easy/Medium/Hard>",
        "marks": <number>
    },
    {
        "questionText": "<question text>",
        "topic": "<topic name>",
        "difficulty": "<Easy/Medium/Hard>",
        "marks": <number>
    },
    ...
]
\`\`\`

Example:
\`\`\`json
[
    {
        "questionText": "Explain the concept of quantum entanglement.",
        "topic": "Quantum Physics",
        "difficulty": "Medium",
        "marks": 5
    },
    {
        "questionText": "Differentiate between mitosis and meiosis.",
        "topic": "Cell Biology",
        "difficulty": "Easy",
        "marks": 3
    }
]
\`\`\`

Begin!
`;

    const userPrompt = `Please extract the structured questions from the following text:\n\n${extractedText}`;

    const response = await openai.createChatCompletion({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.data.choices[0].message?.content;

    if (!content) {
      console.warn("No content received from OpenAI for question extraction.");
      return { questions: [] };
    }

    try {
      const questions = JSON.parse(content);
      console.log(`Extracted ${questions.length} structured questions`);
      return { questions: questions };
    } catch (error) {
      console.error("Error parsing question extraction response:", error);
      console.error("Raw response:", content);
      return { questions: [] };
    }
  } catch (error: any) {
    console.error("Error extracting structured questions:", error);
    throw new Error(`Question extraction failed: ${error.message}`);
  }
}

/**
 * Extracts questions from text using a simpler method
 */
export async function extractQuestionsFromText(apiKey: string, text: string): Promise<any[]> {
  try {
    console.log("Extracting questions from text");
    const openai = initializeOpenAI(apiKey);

    const systemPrompt = `You are an AI assistant specialized in extracting questions from text. Your goal is to identify and extract each question and format the output as a JSON array.

Instructions:
1.  Carefully analyze the provided text to identify individual questions.
2.  Extract the complete text of each question.
3.  Format the output as a JSON array of strings.

Output Format:
\`\`\`json
[
    "<question text>",
    "<question text>",
    ...
]
\`\`\`

Example:
\`\`\`json
[
    "Explain the concept of quantum entanglement.",
    "Differentiate between mitosis and meiosis."
]
\`\`\`

Begin!
`;

    const userPrompt = `Please extract the questions from the following text:\n\n${text}`;

    const response = await openai.createChatCompletion({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = response.data.choices[0].message?.content;

    if (!content) {
      console.warn("No content received from OpenAI for question extraction.");
      return [];
    }

    try {
      const questions = JSON.parse(content);
      console.log(`Extracted ${questions.length} questions`);
      return questions;
    } catch (error) {
      console.error("Error parsing question extraction response:", error);
      console.error("Raw response:", content);
      return [];
    }
  } catch (error: any) {
    console.error("Error extracting questions:", error);
    throw new Error(`Question extraction failed: ${error.message}`);
  }
}

/**
 * Matches student answers to questions using semantic similarity
 */
export async function matchAnswersToQuestions(apiKey: string, questionPaperText: string, studentAnswerText: string): Promise<{ matches: any[] }> {
  try {
    console.log("Matching student answers to questions using semantic similarity");
    const openai = initializeOpenAI(apiKey);

    const systemPrompt = `You are an AI assistant specialized in matching student answers to questions based on semantic similarity. Your goal is to identify which questions each answer is most likely addressing.

Instructions:
1.  Analyze the provided question paper text to understand the context of each question.
2.  Analyze the student's answer text to identify individual answers.
3.  Determine the semantic similarity between each answer and each question.
4.  Identify the most likely question for each answer.
5.  Format the output as a JSON array of match objects.

Output Format:
\`\`\`json
[
    {
        "question": "<question text>",
        "answer": "<answer text>",
        "similarityScore": <number between 0 and 1>
    },
    ...
]
\`\`\`

Example:
\`\`\`json
[
    {
        "question": "Explain the concept of quantum entanglement.",
        "answer": "Quantum entanglement is a phenomenon where two particles become linked...",
        "similarityScore": 0.85
    },
    {
        "question": "Differentiate between mitosis and meiosis.",
        "answer": "Mitosis is a type of cell division that results in two daughter cells...",
        "similarityScore": 0.92
    }
]
\`\`\`

Begin!
`;

    const userPrompt = `Question Paper Text:\n${questionPaperText}\n\nStudent Answer Text:\n${studentAnswerText}`;

    const response = await openai.createChatCompletion({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.data.choices[0].message?.content;

    if (!content) {
      console.warn("No content received from OpenAI for answer matching.");
      return { matches: [] };
    }

    try {
      const matches = JSON.parse(content);
      console.log(`Found ${matches.length} potential question-answer matches`);
      return { matches: matches };
    } catch (error) {
      console.error("Error parsing answer matching response:", error);
      console.error("Raw response:", content);
      return { matches: [] };
    }
  } catch (error: any) {
    console.error("Error matching answers to questions:", error);
    throw new Error(`Answer matching failed: ${error.message}`);
  }
}
