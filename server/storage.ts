import { 
  Assessment, InsertAssessment, 
  User, InsertUser,
  AssessmentSubmission, InsertAssessmentSubmission,
  assessments,    users, assessmentSubmissions
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { drizzle } from 'drizzle-orm/better-sqlite3';

export interface IStorage {
  // Assessments
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: number): Promise<Assessment | undefined>;
  listAssessments(): Promise<Assessment[]>;
  updateAssessment(id: number, updates: Partial<Assessment>): Promise<Assessment>;

  // Assessment Submissions
  createSubmission(submission: InsertAssessmentSubmission): Promise<AssessmentSubmission>;
  getSubmissionsForAssessment(assessmentId: number): Promise<AssessmentSubmission[]>;
 
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const [newAssessment] = await db
      .insert(assessments)
      .values(assessment)
      .returning();
    return newAssessment;
  }

  async updateAssessment(id: number, updates: Partial<Assessment>): Promise<Assessment> {
    const [updated] = await db
      .update(assessments)
      .set(updates)
      .where(eq(assessments.id, id))
      .returning();

    if (!updated) {
      throw new Error("Assessment not found");
    }
    return updated;
  }

  async getAssessment(id: number): Promise<Assessment | undefined> {
    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, id));
    return assessment;
  }

  async listAssessments(): Promise<Assessment[]> {
    return db.select().from(assessments);
  }
 
 
  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createSubmission(submission: InsertAssessmentSubmission): Promise<AssessmentSubmission> {
    const [newSubmission] = await db
      .insert(assessmentSubmissions)
      .values(submission)
      .returning();
    return newSubmission;
  }

  async getSubmissionsForAssessment(assessmentId: number): Promise<AssessmentSubmission[]> {
    return db
      .select()
      .from(assessmentSubmissions)
      .where(eq(assessmentSubmissions.assessmentId, assessmentId));
  }
}

export const storage = new DatabaseStorage();