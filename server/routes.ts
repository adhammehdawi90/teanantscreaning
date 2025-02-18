import type { Express } from "express";
import { createServer, type Server } from "http";
import {
  insertAssessmentSchema,
  insertVideoInterviewSchema,
} from "@shared/schema";
import { generateQuestions } from "./lib/openai";
import { ZodError } from "zod";
import { videoUpload } from "./middleware/videoStorage";
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { storage } from "./storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function registerRoutes(app: Express): Server {
  // Log all requests to /uploads for debugging
  app.use("/uploads", (req, res, next) => {
    console.log("Upload request:", {
      path: req.path,
      method: req.method,
      fullPath: path.join(uploadsDir, req.path),
      exists: fs.existsSync(path.join(uploadsDir, req.path)),
    });
    next();
  });
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, path.basename(req.path));

    // Log detailed file information
    console.log("Attempting to serve file:", {
      requestedPath: req.path,
      fullPath: filePath,
      exists: fs.existsSync(filePath),
    });

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error("File not found:", filePath);
      return res.status(404).send("File not found");
    }

    // Set proper headers for video streaming
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // Handle range requests for video streaming
    if (req.headers.range) {
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      console.log("Streaming video chunk:", {
        start,
        end,
        chunkSize,
        fileSize,
      });

      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": "video/webm",
      });
      file.pipe(res);
    } else {
      // For non-range requests, serve the entire file
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/webm",
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  // Update video upload endpoint with proper permissions
  app.post(
    "/api/assessments/:id/upload-videos",
    videoUpload.fields([
      { name: "webcamVideo", maxCount: 1 },
      { name: "screenVideo", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        console.log("Starting video upload process...");

        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        if (!files || Object.keys(files).length === 0) {
          console.warn("No files were uploaded");
          return res.status(400).json({ error: "No files were uploaded" });
        }

        const urls: Record<string, string> = {};
        for (const [fieldname, fieldFiles] of Object.entries(files)) {
          if (fieldFiles && fieldFiles.length > 0) {
            const file = fieldFiles[0];

            console.log(`Processing ${fieldname}:`, {
              originalName: file.originalname,
              savedPath: file.path,
              size: file.size,
              mimetype: file.mimetype,
            });

            try {
              // Set proper file permissions
              await fs.promises.chmod(file.path, 0o644);

              // Verify file exists and is readable
              await fs.promises.access(file.path, fs.constants.R_OK);
              const stats = await fs.promises.stat(file.path);
              console.log(`File ${file.filename} verified:`, stats);

              // Generate relative URL path
              const publicUrl = `/uploads/${path.basename(file.path)}`;
              urls[`${fieldname}Url`] = publicUrl;

              console.log(`Generated public URL for ${fieldname}:`, publicUrl);
            } catch (error) {
              console.error(
                `File verification failed for ${file.filename}:`,
                error
              );
              return res
                .status(500)
                .json({ error: `File verification failed: ${error.message}` });
            }
          }
        }

        console.log("Returning URLs:", urls);
        res.json(urls);
      } catch (error: any) {
        console.error("Video upload error:", error);
        res.status(500).json({ error: error.message });
      }
    }
  );
  // Update video upload endpoint
  //  // Update video upload endpoint
  // app.post("/api/assessments/:id/upload-videos", videoUpload.fields([
  //   { name: 'webcamVideo', maxCount: 1 },
  //   { name: 'screenVideo', maxCount: 1 }
  // ]), async (req, res) => {
  //   try {
  //     console.log("Starting video upload process...");

  //     // Type assertion for files
  //     const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  //     if (!files || Object.keys(files).length === 0) {
  //       console.warn('No files were uploaded');
  //       return res.status(400).json({ error: 'No files were uploaded' });
  //     }

  //     // Process each uploaded file
  //     const urls: Record<string, string> = {};
  //     for (const [fieldname, fieldFiles] of Object.entries(files)) {
  //       if (fieldFiles && fieldFiles.length > 0) {
  //         const file = fieldFiles[0];

  //         console.log(`Processing ${fieldname}:`, {
  //           originalName: file.originalname,
  //           savedPath: file.path,
  //           size: file.size,
  //           mimetype: file.mimetype
  //         });

  //         // Verify file exists and is readable
  //         try {
  //           await fs.promises.access(file.path, fs.constants.R_OK);
  //           const stats = await fs.promises.stat(file.path);
  //           console.log(`File ${file.filename} verified:`, stats);

  //           // Generate public URL
  //           const relativeUrl = path.relative(config.uploads.directory, file.path);
  //           const publicUrl = `${config.uploads.publicPath}/${relativeUrl.replace(/\\/g, '/')}`;
  //           urls[`${fieldname}Url`] = publicUrl;

  //           console.log(`Generated public URL for ${fieldname}:`, publicUrl);
  //         } catch (error) {
  //           console.error(`File verification failed for ${file.filename}:`, error);
  //           return res.status(500).json({ error: `File verification failed: ${error.message}` });
  //         }
  //       }
  //     }

  //     console.log('Returning URLs:', urls);
  //     res.json(urls);
  //   } catch (error: any) {
  //     console.error('Video upload error:', error);
  //     res.status(500).json({ error: error.message });
  //   }
  // });

  // Assessments
  app.post("/api/assessments", async (req, res) => {
    try {
      console.log("Creating assessment with data:", req.body);
      const data = insertAssessmentSchema.parse(req.body);
      const assessment = await storage.createAssessment(data);
      console.log("Assessment created:", assessment);
      res.json(assessment);
    } catch (err) {
      console.error("Error creating assessment:", err);
      const error = err as Error | ZodError;
      res.status(400).json({
        error: "message" in error ? error.message : error.toString(),
      });
    }
  });

  app.patch("/api/assessments/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const assessment = await storage.updateAssessment(id, req.body);
      res.json(assessment);
    } catch (err) {
      console.error("Error updating assessment:", err);
      const error = err as Error | ZodError;
      res.status(400).json({
        error: "message" in error ? error.message : error.toString(),
      });
    }
  });

  app.get("/api/assessments", async (req, res) => {
    try {
      const assessments = await storage.listAssessments();
      res.json(assessments);
    } catch (err) {
      console.error("Error listing assessments:", err);
      res.status(500).json({ error: "Failed to fetch assessments" });
    }
  });

  app.get("/api/assessments/:id", async (req, res) => {
    try {
      const assessment = await storage.getAssessment(Number(req.params.id));
      if (!assessment) {
        res.status(404).json({ error: "Assessment not found" });
        return;
      }
      res.json(assessment);
    } catch (err) {
      console.error("Error fetching assessment:", err);
      res.status(500).json({ error: "Failed to fetch assessment" });
    }
  });

  // Update the existing submissions endpoint
  app.get("/api/assessments/:id/submissions", async (req, res) => {
    try {
      console.log("Fetching submissions for assessment:", req.params.id);
      const id = Number(req.params.id);
      const submissions = await storage.getSubmissionsForAssessment(id);
      console.log("Found submissions:", submissions);
      res.json(submissions);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Update the submit endpoint to include evaluation
  app.post("/api/assessments/:id/submit", async (req, res) => {
    try {
      console.log("Submitting assessment:", req.params.id);
      const id = Number(req.params.id);
      const { answers, webcamRecordingUrl, screenRecordingUrl } = req.body;

      console.log("Answers received:", answers);

      const assessment = await storage.getAssessment(id);
      if (!assessment) {
        res.status(404).json({ error: "Assessment not found" });
        return;
      }

      // Evaluate each answer
      const questions = assessment.questions as Question[];
      const evaluations: QuestionEvaluation[] = [];
      let totalScore = 0;

      for (const question of questions) {
        const answer = answers[question.id];
        console.log(`Evaluating question ${question.id}, answer:`, answer);

        let evaluation: QuestionEvaluation = {
          questionId: question.id,
          isCorrect: false,
          score: 0,
          feedback: "",
        };

        if (question.type === "multiple_choice") {
          evaluation.isCorrect = answer === question.correctAnswer;
          evaluation.score = evaluation.isCorrect ? 100 : 0;
          evaluation.feedback = evaluation.isCorrect
            ? "Correct answer!"
            : `Incorrect. The correct answer was: ${question.correctAnswer}`;
        } else if (question.type === "coding" && question.testCases) {
          // For coding questions, we'll evaluate against test cases
          const testResults = [];
          let passedTests = 0;

          for (const test of question.testCases) {
            const passed = answer.includes(test.expectedOutput);
            testResults.push({
              passed,
              input: test.input,
              expectedOutput: test.expectedOutput,
              actualOutput: answer,
            });
            if (passed) passedTests++;
          }

          evaluation.testResults = testResults;
          evaluation.score = Math.round(
            (passedTests / question.testCases.length) * 100
          );
          evaluation.isCorrect = evaluation.score === 100;
          evaluation.feedback = `Passed ${passedTests} out of ${question.testCases.length} test cases`;
        } else {
          // For open-ended questions, we'll give a basic score
          evaluation.score = answer.length > 50 ? 100 : 50;
          evaluation.feedback = "Open-ended response evaluated";
        }

        evaluations.push(evaluation);
        totalScore += evaluation.score;
      }

      // Calculate average score
      totalScore = Math.round(totalScore / questions.length);

      console.log("Creating submission with evaluations:", evaluations);

      // Create submission record with video URLs
      const submission = await storage.createSubmission({
        assessmentId: id,
        candidateId: 1, // TODO: Replace with actual candidate ID
        candidateName: "John Doe", // TODO: Replace with actual candidate name
        submittedAt: new Date().toISOString(),
        answers,
        evaluations,
        totalScore,
        webcamRecordingUrl,
        screenRecordingUrl,
      });

      console.log("Submission created:", submission);
      res.json(submission);
    } catch (err) {
      console.error("Error submitting assessment:", err);
      const error = err as Error;
      res.status(500).json({
        error: error.message || "Failed to submit assessment",
      });
    }
  });
 

  // Question Generation
  app.post("/api/generate-questions", async (req, res) => {
    try {
      console.log("Generating questions with params:", req.body);
      const { role, skills, difficulty, type } = req.body;

      if (!role || !skills || !difficulty || !type) {
        throw new Error(
          "Missing required parameters: role, skills, difficulty, and type are required"
        );
      }

      if (!Array.isArray(skills) || skills.length === 0) {
        throw new Error("Skills must be a non-empty array");
      }

      const questions = await generateQuestions(role, skills, difficulty, type);
      console.log("Generated questions:", questions);

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
 
 
  const httpServer = createServer(app);
  return httpServer;
}

interface Question {
  id: string;
  type: "multiple_choice" | "coding" | "open_ended";
  text: string;
  correctAnswer?: string;
  testCases?: { input: string; expectedOutput: string }[];
}

interface QuestionEvaluation {
  questionId: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
  testResults?: {
    passed: boolean;
    input: string;
    expectedOutput: string;
    actualOutput: string;
  }[];
}

interface Submission {
  id?: number;
  assessmentId: number;
  candidateId: number;
  candidateName: string;
  submittedAt: string;
  answers: { [questionId: string]: string };
  evaluations: QuestionEvaluation[];
  totalScore: number;
  webcamRecordingUrl?: string;
  screenRecordingUrl?: string;
}
