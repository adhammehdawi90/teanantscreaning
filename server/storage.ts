import { Assessment, Submission, User } from './db';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';

// Helper function to check if a string is a valid MongoDB ObjectId
function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

export interface IStorage {
  createAssessment(assessment: any): Promise<any>;
  updateAssessment(id: string, assessment: any): Promise<any>;
  getAssessmentById(id: string): Promise<any | undefined>;
  getAllAssessments(): Promise<any[]>;
  createSubmission(submission: any): Promise<any>;
  getSubmissionById(id: string): Promise<any | undefined>;
  getSubmissionsForAssessment(assessmentId: string): Promise<any[]>;
  createUser(user: any): Promise<any>;
  getUserByEmail(email: string): Promise<any | undefined>;
  findOrCreateAnonymousUser(): Promise<any>;
}

export class MongoDBStorage implements IStorage {
  async createAssessment(assessment: any): Promise<any> {
    try {
      const newAssessment = new Assessment(assessment);
      await newAssessment.save();
      return newAssessment.toObject();
    } catch (error) {
      console.error('Failed to create assessment:', error);
      throw error;
    }
  }

  async updateAssessment(id: string, assessment: any): Promise<any> {
    try {
      // Validate the ID before querying
      if (!isValidObjectId(id)) {
        throw new Error(`Invalid assessment ID format: ${id}`);
      }
      
      const updatedAssessment = await Assessment.findByIdAndUpdate(
        id,
        { ...assessment, updatedAt: new Date() },
        { new: true }
      );
      
      if (!updatedAssessment) {
        throw new Error(`Assessment with ID ${id} not found`);
      }
      
      return updatedAssessment.toObject();
    } catch (error) {
      console.error(`Failed to update assessment ${id}:`, error);
      throw error;
    }
  }

  async getAssessmentById(id: string): Promise<any | undefined> {
    try {
      // Validate the ID before querying
      if (!isValidObjectId(id)) {
        console.warn(`Invalid assessment ID format: ${id}`);
        return undefined;
      }
      
      const assessment = await Assessment.findById(id);
      return assessment ? assessment.toObject() : undefined;
    } catch (error) {
      console.error(`Failed to get assessment ${id}:`, error);
      return undefined;
    }
  }

  async getAllAssessments(): Promise<any[]> {
    try {
      const assessments = await Assessment.find().sort({ createdAt: -1 });
      return assessments.map(a => a.toObject());
    } catch (error) {
      console.error('Failed to get all assessments:', error);
      return [];
    }
  }

  async createSubmission(submission: any): Promise<any> {
    try {
      const newSubmission = new Submission(submission);
      await newSubmission.save();
      return newSubmission.toObject();
    } catch (error) {
      console.error('Failed to create submission:', error);
      throw error;
    }
  }

  async getSubmissionById(id: string): Promise<any | undefined> {
    try {
      // Validate the ID before querying
      if (!isValidObjectId(id)) {
        console.warn(`Invalid submission ID format: ${id}`);
        return undefined;
      }
      
      const submission = await Submission.findById(id).populate('assessmentId');
      return submission ? submission.toObject() : undefined;
    } catch (error) {
      console.error(`Failed to get submission ${id}:`, error);
      return undefined;
    }
  }

  async getSubmissionsForAssessment(assessmentId: string): Promise<any[]> {
    try {
      // Validate the ID before querying
      if (!isValidObjectId(assessmentId)) {
        console.warn(`Invalid assessment ID format for submissions query: ${assessmentId}`);
        return [];
      }
      
      const submissions = await Submission.find({ assessmentId: new ObjectId(assessmentId) });
      return submissions.map(s => s.toObject());
    } catch (error) {
      console.error(`Failed to get submissions for assessment ${assessmentId}:`, error);
      return [];
    }
  }

  async createUser(user: any): Promise<any> {
    try {
      const newUser = new User(user);
      await newUser.save();
      return newUser.toObject();
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<any | undefined> {
    try {
      const user = await User.findOne({ email });
      return user ? user.toObject() : undefined;
    } catch (error) {
      console.error(`Failed to get user by email ${email}:`, error);
      return undefined;
    }
  }

  // New method to find or create an anonymous user for assessments
  async findOrCreateAnonymousUser(): Promise<any> {
    try {
      // Look for an existing anonymous user
      let anonymousUser = await User.findOne({ 
        email: 'anonymous@system.local',
        name: 'Anonymous User'
      });
      
      // If no anonymous user exists, create one
      if (!anonymousUser) {
        console.log('Creating anonymous user for submissions');
        anonymousUser = new User({
          email: 'anonymous@system.local',
          name: 'Anonymous User',
          role: 'anonymous'
        });
        await anonymousUser.save();
      }
      
      return anonymousUser.toObject();
    } catch (error) {
      console.error('Failed to find or create anonymous user:', error);
      throw error;
    }
  }
}

// Create and export storage instance
const storage = new MongoDBStorage();
export default storage;