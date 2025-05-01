import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
import mime from "mime-types";
import path from "path";

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("GOOGLE_API_KEY is not set in the environment variables.");
  // Optionally, you could throw an error here or handle it differently
  // throw new Error("GOOGLE_API_KEY is not set.");
}

// Ensure the API key is defined before creating the client
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Helper function to read file and convert to generative part
function fileToGenerativePart(path: string, mimeType: string) {
  console.log(`Reading file at path: ${path}, mime type: ${mimeType}`);
  const fileStats = fs.statSync(path);
  console.log(`File size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);
  
  // Check if file is larger than 20MB
  if (fileStats.size > 20 * 1024 * 1024) {
    console.warn(`File is larger than 20MB. This may cause issues with the Gemini API.`);
  }
  
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

// Main video analysis function
export async function analyzeInterviewVideo(videoPath: string, useMockResponse = false): Promise<any> {
  console.log(`Starting video analysis for: ${videoPath}`);
  console.log(`API Key present: ${!!apiKey}`);
  console.log(`Gemini client initialized: ${!!genAI}`);
  
  if (useMockResponse) {
    throw new Error("Mock responses have been disabled. Please use actual video analysis.");
  }
  
  if (!genAI) {
    console.error("Google Generative AI client not initialized. Check API Key.");
    throw new Error("Google Generative AI client not initialized. Check API Key.");
  }

  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    console.error(`Video file does not exist at path: ${videoPath}`);
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const mimeType = mime.lookup(videoPath);
  if (!mimeType || !mimeType.startsWith("video/")) {
    console.error(`Unsupported file type: ${mimeType || 'unknown'}. Path: ${videoPath}`);
    throw new Error(`Unsupported file type: ${mimeType || 'unknown'}.`);
  }

  try {
    // 1. Prepare the video data part
    const videoPart = fileToGenerativePart(videoPath, mimeType);

    // 2. Choose the model
    const model = genAI.getGenerativeModel({
       model: "gemini-2.0-flash", // Updated to recommended model
       // systemInstruction: "...", // Optional: Add system instruction if needed
    });

    // 3. Construct the prompt with STRICT evaluation criteria
    const prompt = `
Please analyze the provided interview video recording with STRICT evaluation criteria. Be extremely critical in your assessment. Focus on the following aspects of the candidate:

1.  **Language Proficiency - ZERO TOLERANCE FOR SILENCE:**
    *   If the candidate does not speak at all or remains silent for significant portions, assign a score of 0.
    *   Clarity of speech (enunciation, pace) - deduct points heavily for mumbling or unclear speech.
    *   Vocabulary richness and appropriateness - strictly assess if vocabulary is limited or inappropriate.
    *   Grammar and sentence structure - be highly critical of any grammatical errors.
    *   Fluency and confidence in communication - penalize hesitation and lack of confidence severely.
    *   Overall effectiveness in conveying ideas - require complete, coherent thoughts.

2.  **Behavioral Analysis - MANDATORY ENGAGEMENT:**
    *   Non-verbal communication (eye contact, posture, gestures) - lack of eye contact or poor posture is severely penalized.
    *   Active listening indicators - absence of active listening cues should result in very low scores.
    *   Level of engagement and attentiveness - any signs of distraction or disinterest warrant immediate point deduction.
    *   If candidate appears disengaged, passive, or unresponsive, assign a score of 0-2 in this category.

3.  **Attitude Assessment - STRICT PROFESSIONALISM STANDARDS:**
    *   Professionalism and demeanor - any casual or inappropriate behavior results in significant score reduction.
    *   Enthusiasm and interest - lack of visible enthusiasm should be severely penalized.
    *   Positivity and approach to questions - negative attitude or defensiveness results in minimal scoring.
    *   Evidence of critical thinking - failure to demonstrate problem-solving approach warrants a score below 3.

4.  **Overall Impression - ZERO TOLERANCE FOR POOR PERFORMANCE:**
    *   If the candidate fails to speak or engage meaningfully, the overall score must not exceed 2.
    *   Any category with a score of 0 should heavily impact the final assessment.
    *   Only exceptional performance in all areas should receive scores of 8 or above.
    *   Be extremely critical in identifying weaknesses and developmental needs.

CRITICAL SCORING GUIDELINES:
- Scores should range from 0-10, with 0 meaning complete failure/absence and 10 meaning exceptional performance
- Default to lower scores when in doubt
- If candidate does not speak or barely speaks, overall score MUST be 0-1
- Any significant silence periods must be noted and heavily penalized
- Consider 5 as "barely acceptable" rather than average
- Scores 8+ should be reserved only for truly outstanding performance

Please provide the analysis in a structured JSON format like this:
{
  "summary": "Critical assessment of the candidate's performance...",
  "overall_score": <number_0_to_10>,
  "participation_level": {
    "speaking_time_percentage": "<estimated percentage of time candidate spoke>",
    "silence_periods": "<number and duration of silence periods>",
    "score": <number_0_to_10>
  }, 
  "language_proficiency": {
    "clarity": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "vocabulary": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "grammar": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "fluency": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "effectiveness": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "notes": "<critical notes on language deficiencies>"
  },
  "behavioral_analysis": {
    "non_verbal": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "active_listening": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "engagement": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "notes": "<critical notes on behavioral deficiencies>"
  },
  "attitude_assessment": {
    "professionalism": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "enthusiasm": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "positivity": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "critical_thinking": {
      "assessment": "<critical assessment>",
      "score": <number_0_to_10>
    },
    "notes": "<critical notes on attitude deficiencies>"
  },
  "critical_flags": [
    "<list of serious concerns or red flags observed>"
  ],
  "final_recommendation": "<REJECT/CONSIDER WITH RESERVATIONS/CONSIDER>"
}
`;

    // 4. Generate content using the model
    console.log("Sending request to Gemini model...");
    console.log(`Using model: ${model.model}`);

    const result = await model.generateContent([prompt, videoPart]);

    const response = result.response;
    if (!response) {
      console.error("Gemini response was empty or undefined.");
      throw new Error("Empty response received from Gemini model.");
    }
    
    const responseText = response.text();
    console.log("Received raw response from Gemini:", responseText.substring(0, 200) + "...");
    
    try {
      const analysisJson = JSON.parse(responseText);
      console.log("Successfully parsed JSON from Gemini response");
      return analysisJson;
    } catch (parseError) {
      console.error("Failed to parse JSON from Gemini response:", parseError);
      console.error("Raw response:", responseText);
      
      // If we can't parse the JSON, try to extract it from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          console.log("Successfully extracted and parsed JSON from response");
          return extractedJson;
        } catch (extractError) {
          console.error("Failed to extract and parse JSON:", extractError);
          throw new Error("Could not parse response from AI model. Please try again.");
        }
      } else {
        console.error("Could not find JSON object in response");
        throw new Error("Invalid response format from AI model. Please try again.");
      }
    }
  } catch (error: any) {
    console.error("Error in analyzeInterviewVideo:", error);
    
    // Try fallback to a different model as a last resort
    try {
      console.log("Trying fallback to gemini-1.5-pro model...");
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
      });
      
      // Use the same strict prompt for the fallback model
      const strictFallbackPrompt = `
Analyze this interview with EXTREMELY STRICT criteria. If the candidate doesn't speak or shows minimal participation, give a score of 0-1. Be severely critical of all aspects.

Focus on:
1. SPEAKING TIME - if minimal or none, overall score must be 0-1
2. LANGUAGE QUALITY - be very critical of any issues
3. ENGAGEMENT - penalize any lack of engagement heavily
4. PROFESSIONALISM - demand high standards

Return detailed JSON with scores 0-10 for each category. Include speaking time percentage estimate.
`;
      
      const result = await fallbackModel.generateContent({
        contents: [{ role: "user", parts: [{ text: strictFallbackPrompt }] }],
      });
      
      const response = result.response;
      if (!response) {
        throw new Error("Empty response from fallback model.");
      }
      
      const responseText = response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          throw new Error("Failed to parse fallback response.");
        }
      } else {
        throw new Error("Invalid fallback response format.");
      }
    } catch (fallbackError: any) {
      console.error("Fallback attempt failed:", fallbackError);
      // Return the original error, not a mock response
      throw new Error(`Video analysis failed: ${error.message || "Unknown error"}`);
    }
  }
}

// Mock implementation of video analysis with Gemini
// Remove the entire mock implementation below 