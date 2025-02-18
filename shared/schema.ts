// import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
// import { createInsertSchema } from "drizzle-zod";
// import { z } from "zod";

// export const assessments = pgTable("assessments", {
//   id: serial("id").primaryKey(),
//   title: text("title").notNull(),
//   description: text("description").notNull(),
//   type: text("type").notNull(), // cognitive, technical, situational
//   questions: jsonb("questions").notNull().default([]),
//   createdById: integer("created_by_id").notNull(),
//   requiresRecording: boolean("requires_recording").notNull().default(false),
// });

// export const videoInterviews = pgTable("video_interviews", {
//   id: serial("id").primaryKey(),
//   title: text("title").notNull(),
//   description: text("description").notNull(),
//   questions: jsonb("questions").notNull().default([]),
//   videoUrl: text("video_url"),
//   candidateId: integer("candidate_id").notNull(),
//   assessmentId: integer("assessment_id").notNull(),
// });

// export const users = pgTable("users", {
//   id: serial("id").primaryKey(),
//   username: text("username").notNull().unique(),
//   password: text("password").notNull(),
//   role: text("role").notNull().default("candidate"),
// });

// export const assessmentSubmissions = pgTable("assessment_submissions", {
//   id: serial("id").primaryKey(),
//   assessmentId: integer("assessment_id").notNull(),
//   candidateId: integer("candidate_id").notNull(),
//   candidateName: text("candidate_name").notNull(),
//   submittedAt: text("submitted_at").notNull(),
//   answers: jsonb("answers").notNull(),
//   evaluations: jsonb("evaluations").notNull(),
//   totalScore: integer("total_score").notNull(),
//   screenRecordingUrl: text("screen_recording_url"),
//   webcamRecordingUrl: text("webcam_recording_url"),
// });

// export const insertAssessmentSchema = createInsertSchema(assessments).omit({ id: true });
// export const insertVideoInterviewSchema = createInsertSchema(videoInterviews).omit({ id: true });
// export const insertUserSchema = createInsertSchema(users).omit({ id: true });
// export const insertAssessmentSubmissionSchema = createInsertSchema(assessmentSubmissions).omit({ id: true });

// export type Assessment = typeof assessments.$inferSelect;
// export type VideoInterview = typeof videoInterviews.$inferSelect;
// export type User = typeof users.$inferSelect;
// export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;  
// export type InsertVideoInterview = z.infer<typeof insertVideoInterviewSchema>;
// export type InsertUser = z.infer<typeof insertUserSchema>;
// export type InsertAssessmentSubmission = z.infer<typeof insertAssessmentSubmissionSchema>;

// export type Question = {
//   id: string;
//   type: "multiple_choice" | "open_ended" | "coding";
//   content: string;
//   options?: string[];
//   correctAnswer?: string;
//   explanation?: string;
//   codeTemplate?: string;
//   testCases?: Array<{
//     input: string;
//     expectedOutput: string;
//   }>;
//   difficulty?: "beginner" | "intermediate" | "advanced";
//   category?: string;
//   skills?: string[];
// };

// export type QuestionEvaluation = {
//   isCorrect: boolean;
//   score: number;
//   feedback: string;
//   questionId: string;
//   testResults?: Array<{
//     passed: boolean;
//     input: string;
//     expectedOutput: string;
//     actualOutput: string;
//   }>;
// };

// export type AssessmentSubmission = {
//   id: number;
//   assessmentId: number;
//   candidateId: number;
//   candidateName: string;
//   submittedAt: string;
//   answers: Record<string, string>;
//   evaluations: QuestionEvaluation[];
//   totalScore: number;
//   screenRecordingUrl?: string;
//   webcamRecordingUrl?: string;
// };


import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // cognitive, technical, situational
  questions: jsonb("questions").notNull().default([]),
  createdById: integer("created_by_id").notNull(),
  requiresRecording: boolean("requires_recording").notNull().default(false),
});

 

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("candidate"),
});

export const assessmentSubmissions = pgTable("assessment_submissions", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").notNull(),
  candidateId: integer("candidate_id").notNull(),
  candidateName: text("candidate_name").notNull(),
  submittedAt: text("submitted_at").notNull(),
  answers: jsonb("answers").notNull(),
  evaluations: jsonb("evaluations").notNull(),
  totalScore: integer("total_score").notNull(),
  screenRecordingUrl: text("screen_recording_url"),
  webcamRecordingUrl: text("webcam_recording_url"),
});

 

// Export schemas
export const insertAssessmentSchema = createInsertSchema(assessments).omit({ id: true });
 export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertAssessmentSubmissionSchema = createInsertSchema(assessmentSubmissions).omit({ id: true });

// Export types
export type Assessment = typeof assessments.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAssessmentSubmission = z.infer<typeof insertAssessmentSubmissionSchema>;
 

export type Question = {
  id: string;
  type: "multiple_choice" | "open_ended" | "coding";
  content: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  codeTemplate?: string;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
  }>;
  difficulty?: "beginner" | "intermediate" | "advanced";
  category?: string;
  skills?: string[];
};

export type QuestionEvaluation = {
  isCorrect: boolean;
  score: number;
  feedback: string;
  questionId: string;
  testResults?: Array<{
    passed: boolean;
    input: string;
    expectedOutput: string;
    actualOutput: string;
  }>;
};

export type AssessmentSubmission = {
  id: number;
  assessmentId: number;
  candidateId: number;
  candidateName: string;
  submittedAt: string;
  answers: Record<string, string>;
  evaluations: QuestionEvaluation[];
  totalScore: number;
  screenRecordingUrl?: string;
  webcamRecordingUrl?: string;
};


 