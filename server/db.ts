import * as dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import mongoose from 'mongoose';

dotenv.config();

// MongoDB connection string and database name
const connectionString = "mongodb+srv://root:Password123@devtest.f9yfc.mongodb.net/";
const databaseName = "YOUMNAEPScreening";

// You can use either the MongoDB driver directly or Mongoose
// Option 1: MongoDB driver
const client = new MongoClient(connectionString, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Option 2: Mongoose (ODM for MongoDB)
mongoose.connect(`${connectionString}${databaseName}`)
  .then(() => console.log('Connected to MongoDB with Mongoose'))
  .catch(err => console.error('Failed to connect to MongoDB with Mongoose:', err));

async function testConnection() {
  try {
    // Mask password in logs
    const maskedConnectionString = connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log('Testing connection with:', maskedConnectionString);
    
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    
    console.log('Connection successful: MongoDB connection established');
    return true;
  } catch (error: any) {
    console.error('Connection failed:', {
      message: error.message,
      code: error.code,
    });
    
    console.error('Please check:');
    console.error('1. MongoDB connection string is correct');
    console.error('2. Network connectivity to MongoDB server');
    console.error('3. MongoDB server is running');
    
    return false;
  }
}

(async () => {
  await testConnection();
})();

// Export MongoDB client and database for use in the application
export const db = client.db(databaseName);
export { client };

// Define MongoDB schemas using Mongoose

// Example Assessment schema
const AssessmentSchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: {
    type: mongoose.Schema.Types.Mixed, // Allow different types (array or string)
    set: function(v: unknown) {
      // If it's a string, try to parse it as JSON
      if (typeof v === 'string') {
        try {
          return JSON.parse(v);
        } catch (e) {
          console.error('Error parsing questions JSON:', e);
          return v; // Return the original value if parsing fails
        }
      }
      return v; // Return as is if not a string
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Example Submission schema
const SubmissionSchema = new mongoose.Schema({
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },
  candidateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false, // Make candidateId optional
    default: null
  },
  candidateName: { type: String, default: "Anonymous Candidate" },
  answers: { type: Map, of: String },
  webcamRecordingUrl: String,
  screenRecordingUrl: String,
  evaluations: [{ 
    isCorrect: Boolean,
    score: Number,
    feedback: String,
    testResults: String // Already a string, test results will be serialized when saved
  }],
  submittedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Example User schema
const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  role: String,
  createdAt: { type: Date, default: Date.now }
});

// Create and export models
export const Assessment = mongoose.model('Assessment', AssessmentSchema);
export const Submission = mongoose.model('Submission', SubmissionSchema);
export const User = mongoose.model('User', UserSchema);