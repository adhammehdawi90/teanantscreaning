import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import path from "path";

// Define the difficulty types
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type AssessmentType = "cognitive" | "technical" | "situational" | "coding";
export type QuestionType = "multiple_choice" | "radio" | "open_ended" | "video_response";

// The enhanced prompt for generating questions with video response capability
export const getAssessmentPrompt = (
  role: string, 
  skills: string[], 
  difficulty: DifficultyLevel, 
  type: AssessmentType
): string => {
  return `Generate assessment questions for a ${role} position with the following skills: ${skills.join(
    ", "
  )}. Difficulty level: ${difficulty}. Assessment type: ${type}

Please create a comprehensive assessment that evaluates both technical skills and verbal communication abilities - crucial for an Executive Assistant role. Include a mix of the following question types:

1. VIDEO_RESPONSE QUESTIONS (30% of assessment):
   * Create questions that require candidates to record video responses speaking directly to the camera
   * These questions should assess verbal communication, professional presence, problem-solving abilities, and decision-making skills
   * Each video question should have clear evaluation criteria focusing on both content and delivery
   * Include situational questions that reflect real scenarios an EA at YOUMNA might encounter when supporting leaders

2. MULTIPLE_CHOICE / RADIO QUESTIONS (40% of assessment):
   * Create questions testing technical knowledge, prioritization skills, and best practices
   * Include questions about calendar management, inbox organization, travel planning, and other EA duties
   * Ensure questions are practical and relevant to supporting busy executives

3. OPEN_ENDED TEXT QUESTIONS (30% of assessment):
   * Include problem-solving scenarios requiring written responses
   * Test ability to draft professional communications, organize information, and demonstrate attention to detail
   * Focus on skills needed to support MENA business leaders effectively

For technical assessments: Include practical scenarios that test proficiency with tools and software commonly used by Executive Assistants.
For cognitive assessments: Focus on logical reasoning, pattern recognition, and analytical thinking in an EA context.
For situational assessments: Create scenario-based questions that test judgment and decision-making in real executive support situations.

Each question should follow this JSON format:
{
  "questions": [
    {
      "id": "UNIQUE_ID_STRING",
      "type": "video_response" | "multiple_choice" | "radio" | "open_ended",
      "content": "Question text goes here",
      "options": ["array", "of", "options"], // only for multiple_choice and radio
      "correctAnswer": "correct option or solution", // for multiple_choice and radio
      "explanation": "detailed explanation of the answer",
      "videoInstructions": "specific instructions for how the candidate should approach answering this video question", // only for video_response
      "evaluationCriteria": [ // only for video_response and open_ended
        {
          "criterion": "name of criterion",
          "description": "what to look for",
          "weight": "percentage weight of this criterion"
        }
      ],
      "timeLimit": "maximum time allowed for video response in seconds", // only for video_response
      "difficulty": "${difficulty}",
      "category": "category of the question",
      "skills": ["relevant", "skills"],
      "isEliminatory": true | false // mark as true for critical questions where failure would disqualify a candidate
    }
  ]
}

IMPORTANT GUIDELINES:
- Video questions should assess the candidate's ability to think on their feet and communicate clearly
- For video_response questions, include specific instructions about what the candidate should address
- Create questions that reflect YOUMNA's focus on "reclaiming time" and "getting more done" for busy leaders
- Ensure questions evaluate a candidate's ability to be proactive, organized, and detail-oriented
- Include scenarios related to calendar management, email organization, travel planning, and executive support
- Assessment should evaluate if candidates can serve as a true "right hand" to executives
- Ensure the questions are appropriate for MENA region cultural contexts and business practices

For video_response questions, include challenging scenarios that test how candidates would handle sensitive situations, prioritize competing demands, and communicate effectively under pressure.`;
};

// Extended schema for custom question types including video responses
export const extendedQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "radio", "open_ended", "video_response"]),
  content: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  videoInstructions: z.string().optional(),
  evaluationCriteria: z
    .array(
      z.object({
        criterion: z.string(),
        description: z.string(),
        weight: z.string(),
      })
    )
    .optional(),
  timeLimit: z.string().optional(),
  difficulty: z.string(),
  category: z.string(),
  skills: z.array(z.string()),
  isEliminatory: z.boolean().optional(),
});

// Type definition for extended question
export type ExtendedQuestion = z.infer<typeof extendedQuestionSchema>;

// Extended assessment schema
export const extendedAssessmentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Please provide a meaningful description"),
  type: z.enum(["cognitive", "technical", "situational", "coding"]),
  questions: z.array(extendedQuestionSchema).optional().default([]),
  createdById: z.number(),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

// Type definition for extended assessment
export type ExtendedAssessment = z.infer<typeof extendedAssessmentSchema>;

// Updated generate-questions function
export const generateQuestions = async (
  role: string, 
  skills: string[], 
  difficulty: DifficultyLevel, 
  type: AssessmentType
): Promise<ExtendedQuestion[]> => {
  try {
    const prompt = getAssessmentPrompt(role, skills, difficulty, type);
    
    // Send the prompt to the API (using your existing OpenAI or other AI service)
    const response = await fetch("YOUR_AI_API_ENDPOINT", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
      throw new Error(`AI service error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process and validate the returned questions
    let questions;
    
    try {
      // Parse if the response is a string
      if (typeof data === 'string') {
        questions = JSON.parse(data);
      } else if (data.questions) {
        questions = data.questions;
      } else {
        questions = data;
      }
      
      // Ensure each question has a unique ID
      questions = questions.map((q: any, index: number) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${index}`
      }));
      
    } catch (error) {
      console.error("Error parsing AI response:", error);
      throw new Error("Failed to parse generated questions");
    }
    
    return questions;
  } catch (error) {
    console.error("Question generation error:", error);
    throw error;
  }
};

// Sample function to process video submissions
export const processVideoSubmission = async (submissionId: string, videoUrl: string) => {
  try {
    // Extract the video file path from the URL
    const videoFileName = path.basename(videoUrl);
    const fullVideoPath = path.join(__dirname, "../uploads", videoFileName);
    
    // Call the server endpoint to analyze the video instead of using mock
    const response = await fetch(`/api/assessments/process-video/${submissionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ videoUrl: fullVideoPath })
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }
    
    const analysisResult = await response.json();
    return analysisResult;
  } catch (error) {
    console.error("Video processing error:", error);
    throw error;
  }
};

// Function to create custom Zod validators for the extended schemas
export const createExtendedValidators = () => {
  return {
    questionValidator: (data: unknown) => {
      try {
        return extendedQuestionSchema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Question validation error:", error.errors);
        }
        throw error;
      }
    },
    assessmentValidator: (data: unknown) => {
      try {
        return extendedAssessmentSchema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Assessment validation error:", error.errors);
        }
        throw error;
      }
    }
  };
}; 