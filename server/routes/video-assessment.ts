import type { Express } from "express";
// Temporarily define these types directly to avoid import errors
type DifficultyLevel = "beginner" | "intermediate" | "advanced";
type AssessmentType = "cognitive" | "technical" | "situational" | "coding";

// Simple implementation of getAssessmentPrompt
function getAssessmentPrompt(
  role: string, 
  skills: string[], 
  difficulty: DifficultyLevel, 
  type: AssessmentType
): string {
  return `Generate assessment questions for a ${role} position with the following skills: ${skills.join(
    ", "
  )}. Difficulty level: ${difficulty}. Assessment type: ${type}`;
}

import { analyzeInterviewVideo } from "../lib/gemini";
import path from "path";
import fs from "fs";
import storage from "../storage";

// Type definitions
interface EvaluationCriterion {
  criterion: string;
  description: string;
  weight: string;
}

interface VideoQuestion {
  id: string;
  type: string;
  content: string;
  evaluationCriteria?: EvaluationCriterion[];
  [key: string]: any;
}

interface VideoAnalysisResult {
  summary: string;
  overall_score: number;
  language_proficiency?: {
    notes?: string;
    [key: string]: any;
  };
  behavioral_analysis?: {
    notes?: string;
    [key: string]: any;
  };
  attitude_assessment?: {
    notes?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Register video assessment routes
export function registerVideoAssessmentRoutes(app: Express): void {
  // Generate questions with video response option
  app.post("/api/generate-questions", async (req, res) => {
    try {
      console.log("Generating questions with params:", req.body);
      const { role, skills, difficulty, type, includeVideoQuestions = true } = req.body;

      if (!role || !skills || !difficulty || !type) {
        throw new Error(
          "Missing required parameters: role, skills, difficulty, and type are required"
        );
      }

      if (!Array.isArray(skills) || skills.length === 0) {
        throw new Error("Skills must be a non-empty array");
      }

      // Get the prompt with video response questions if enabled
      const prompt = getAssessmentPrompt(
        role, 
        skills, 
        difficulty as DifficultyLevel, 
        type as AssessmentType
      );
      
      // Send the prompt to OpenAI
      const openaiEndpoint = process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
      const openaiResponse = await fetch(openaiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are an expert assessment creator that generates questions in JSON format following exactly the structure provided."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        throw new Error(`OpenAI API error: ${errorText}`);
      }

      const openaiData = await openaiResponse.json();
      const generatedContent = openaiData.choices[0].message.content;
      
      // Extract the JSON from the response
      let questions;
      try {
        // Try to find and parse JSON if the response contains text
        const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonText = jsonMatch[0];
          const parsedData = JSON.parse(jsonText);
          questions = parsedData.questions || parsedData;
        } else {
          // If no JSON found, try parsing the entire response
          questions = JSON.parse(generatedContent);
        }
        
        // If includeVideoQuestions is false, filter out video_response questions
        if (!includeVideoQuestions) {
          questions = questions.filter((q: any) => q.type !== "video_response");
        }
        
        // Ensure each question has a unique ID
        questions = questions.map((q: any, index: number) => ({
          ...q,
          id: q.id || `q-${Date.now()}-${index}`
        }));
        
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError, generatedContent);
        throw new Error("Failed to parse generated questions");
      }

      if (!questions || questions.length === 0) {
        throw new Error("Failed to generate questions");
      }

      res.json(questions);
    } catch (err) {
      console.error("Error generating questions:", err);
      const error = err as Error;
      res.status(500).json({
        error: error.message || "Failed to generate questions",
      });
    }
  });

  // Process video recordings for video response questions
  app.post("/api/assessments/:id/process-video-response", async (req, res) => {
    try {
      const { questionId, submissionId } = req.body;
      
      // Get the submission from the database
      const submission = await storage.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      
      // Get the assessment to find the question
      const assessment = await storage.getAssessmentById(submission.assessmentId);
      if (!assessment) {
        return res.status(404).json({ error: "Assessment not found" });
      }
      
      // Find the specific question
      const question = assessment.questions.find((q: any) => 
        q._id?.toString() === questionId || q.id === questionId
      ) as VideoQuestion | undefined;
      
      if (!question || question.type !== "video_response") {
        return res.status(400).json({ error: "Question not found or not a video response question" });
      }
      
      // Get the video URL from the submission
      const videoUrl = submission.webcamRecordingUrl;
      if (!videoUrl) {
        return res.status(400).json({ error: "No webcam video found for analysis" });
      }
      
      // Construct path to the video file
      const videoFileName = path.basename(videoUrl);
      const fullVideoPath = path.join(__dirname, "../../uploads", videoFileName);
      
      if (!fs.existsSync(fullVideoPath)) {
        return res.status(404).json({ error: "Video file not found on server" });
      }
      
      // Analyze the video with Gemini
      console.log(`Analyzing video for question ${questionId} in submission ${submissionId}`);
      const analysisResult = await analyzeInterviewVideo(fullVideoPath, false);
      
      // Create an evaluation based on the criteria and AI analysis
      const evaluation = {
        questionId,
        submissionId,
        videoAnalysis: analysisResult,
        score: calculateScoreFromAnalysis(analysisResult, question.evaluationCriteria),
        feedback: generateFeedbackFromAnalysis(analysisResult, question.content),
        completedAt: new Date()
      };
      
      // Save the evaluation to the database using updateSubmission
      const updatedSubmission = await storage.updateSubmission(submissionId, {
        videoEvaluation: evaluation
      });
      res.json(evaluation);
    } catch (err) {
      console.error("Error processing video response:", err);
      const error = err as Error;
      res.status(500).json({
        error: error.message || "Failed to process video response",
      });
    }
  });
  
  // Helper function to calculate score based on AI analysis and criteria
  function calculateScoreFromAnalysis(
    analysis: VideoAnalysisResult, 
    criteria?: EvaluationCriterion[]
  ): number {
    if (!analysis || !criteria || !criteria.length) return analysis.overall_score || 0;
    
    // Extract relevant scores from the analysis
    const {
      language_proficiency = {},
      behavioral_analysis = {},
      attitude_assessment = {},
      overall_score = 0
    } = analysis;
    
    // Calculate a weighted score based on the criteria
    let totalWeight = 0;
    let weightedScore = 0;
    
    for (const criterion of criteria) {
      const weight = parseInt(criterion.weight) / 100;
      totalWeight += weight;
      
      // Map criterion to the appropriate analysis category
      let score = 0;
      if (criterion.criterion.toLowerCase().includes('communicat') || 
          criterion.criterion.toLowerCase().includes('language') ||
          criterion.criterion.toLowerCase().includes('verbal')) {
        // Use language proficiency scores
        const langScores = Object.values(language_proficiency)
          .filter(item => typeof item === 'object' && item !== null && 'score' in item)
          .map(item => (item as any).score as number);
        
        score = langScores.length ? 
          (langScores.reduce((sum, s) => sum + s, 0) / langScores.length) : 
          overall_score;
      } 
      else if (criterion.criterion.toLowerCase().includes('behavior') || 
               criterion.criterion.toLowerCase().includes('engagement') ||
               criterion.criterion.toLowerCase().includes('presence')) {
        // Use behavioral analysis scores
        const behaviorScores = Object.values(behavioral_analysis)
          .filter(item => typeof item === 'object' && item !== null && 'score' in item)
          .map(item => (item as any).score as number);
        
        score = behaviorScores.length ? 
          (behaviorScores.reduce((sum, s) => sum + s, 0) / behaviorScores.length) : 
          overall_score;
      }
      else if (criterion.criterion.toLowerCase().includes('attitude') || 
               criterion.criterion.toLowerCase().includes('professional') ||
               criterion.criterion.toLowerCase().includes('enthusiasm')) {
        // Use attitude assessment scores
        const attitudeScores = Object.values(attitude_assessment)
          .filter(item => typeof item === 'object' && item !== null && 'score' in item)
          .map(item => (item as any).score as number);
        
        score = attitudeScores.length ? 
          (attitudeScores.reduce((sum, s) => sum + s, 0) / attitudeScores.length) : 
          overall_score;
      }
      else {
        // Use overall score for general criteria
        score = overall_score;
      }
      
      weightedScore += score * weight;
    }
    
    // Convert to a scale of 100
    return Math.round((weightedScore / totalWeight) * 10);
  }
  
  // Helper function to generate feedback from analysis
  function generateFeedbackFromAnalysis(
    analysis: VideoAnalysisResult, 
    questionContent: string
  ): string {
    if (!analysis || !analysis.summary) {
      return "Unable to generate detailed feedback for this video response.";
    }
    
    // Create a structured feedback message
    let feedback = `## Video Response Evaluation\n\n`;
    feedback += `**Question:** ${questionContent}\n\n`;
    feedback += `**Summary:** ${analysis.summary}\n\n`;
    
    // Add strengths and areas for improvement
    if (analysis.language_proficiency?.notes) {
      feedback += `**Communication:** ${analysis.language_proficiency.notes}\n\n`;
    }
    
    if (analysis.behavioral_analysis?.notes) {
      feedback += `**Presentation:** ${analysis.behavioral_analysis.notes}\n\n`;
    }
    
    if (analysis.attitude_assessment?.notes) {
      feedback += `**Attitude:** ${analysis.attitude_assessment.notes}\n\n`;
    }
    
    feedback += `**Overall Assessment:** This response received a score of ${analysis.overall_score}/10.`;
    
    return feedback;
  }
} 