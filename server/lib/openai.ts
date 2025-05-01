import OpenAI from "openai";
import { type Question } from "@shared/schema";
import dotenv from "dotenv";

dotenv.config();

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateQuestions(
  role: string,
  skills: string[],
  difficulty: "beginner" | "intermediate" | "advanced",
  type: string = "technical"
): Promise<Question[]> {
  console.log("Starting question generation for:", { role, skills, difficulty, type });

  const prompt = `Generate assessment questions for a ${role} position with the following skills: ${skills.join(
    ", "
  )}. Difficulty level: ${difficulty}. Assessment type: ${type}

Please create a varied mix of questions appropriate for the role and assessment type.
For technical assessments: Include coding challenges, technical multiple choice, and problem-solving questions.
For cognitive assessments: Focus on logical reasoning, pattern recognition, and analytical thinking.
For situational assessments: Create scenario-based questions that test judgment and decision-making.

Each question should follow this JSON format:
{
  "questions": [
    {
      "id": "unique-string",
      "type": "multiple_choice" | "open_ended" | "coding",
      "content": "question text",
      "options": ["array", "of", "options"], // only for multiple_choice
      "correctAnswer": "correct option or solution",
      "explanation": "detailed explanation of the answer",
      "codeTemplate": "function template", // only for coding questions
      "testCases": [ // only for coding questions
        {
          "input": "test input",
          "expectedOutput": "expected output"
        }
      ],
      "difficulty": "${difficulty}",
      "category": "category of the question",
      "skills": ["relevant", "skills"]
    }
  ]
}

For coding questions, include practical problems that test actual programming skills.
For multiple choice, ensure 4-5 plausible options with one correct answer.
For open-ended questions, provide detailed evaluation criteria in the explanation.`;

  try {
    console.log("Sending request to OpenAI");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert technical interviewer that creates relevant assessment questions based on job requirements. Generate questions that accurately assess candidate skills while maintaining appropriate difficulty levels.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    console.log("Received response from OpenAI");
    const parsedResponse = JSON.parse(content);

    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      console.error("Invalid response format:", parsedResponse);
      throw new Error("Invalid response format from OpenAI");
    }

    return parsedResponse.questions;
  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error(
      "Failed to generate questions. Please check your OpenAI API key and try again."
    );
  }
}

// Helper function to analyze coding responses
export async function analyzeCodingResponse(
  question: Question,
  response: string
): Promise<{
  isCorrect: boolean;
  feedback: string;
  score: number;
  testResults?: Array<{
    passed: boolean;
    input: string;
    expectedOutput: string;
    actualOutput: string;
  }>;
}> {
  const prompt = `Analyze this coding response for the following question:
Question: ${question.content}
Test Cases: ${JSON.stringify(question.testCases)}

Candidate's Response:
${response}

Please evaluate the response and provide feedback in this JSON format:
{
  "isCorrect": boolean,
  "feedback": "detailed feedback explaining what was good and what could be improved",
  "score": number, // score from 0-100
  "testResults": [
    {
      "passed": boolean,
      "input": "test input",
      "expectedOutput": "expected output",
      "actualOutput": "actual output"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert code reviewer that provides detailed and constructive feedback on coding solutions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error analyzing coding response:", error);
    throw new Error(
      "Failed to analyze coding response. Please check your OpenAI API key and try again."
    );
  }
}

// Helper function to generate follow-up questions based on previous responses
export async function generateFollowUpQuestion(
  previousQuestion: Question,
  response: string
): Promise<Question> {
  const prompt = `Based on this previous question and response, generate a relevant follow-up question that digs deeper into the candidate's knowledge:

Previous Question: ${previousQuestion.content}
Category: ${previousQuestion.category}
Skills: ${previousQuestion.skills?.join(", ")}
Candidate's Response: ${response}

Generate a follow-up question in this JSON format:
{
  "question": {
    "id": "unique-string",
    "type": "multiple_choice" | "open_ended" | "coding",
    "content": "follow-up question text that builds upon the previous response",
    "options": ["array", "of", "options"], // only if multiple_choice
    "explanation": "why this follow-up is relevant",
    "category": "question category",
    "skills": ["relevant", "skills"]
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert interviewer that generates relevant follow-up questions based on candidate responses.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    const parsedResponse = JSON.parse(content);
    return parsedResponse.question;
  } catch (error) {
    console.error("Error generating follow-up question:", error);
    throw new Error(
      "Failed to generate follow-up question. Please check your OpenAI API key and try again."
    );
  }
}