// Transcript debugging and management utilities
import storage from '../storage';
import fs from 'fs';
import path from 'path';

/**
 * Utility to check if a submission has a transcript
 */
export async function checkSubmissionTranscript(submissionId: string) {
  try {
    const submission = await storage.getSubmissionById(submissionId);
    if (!submission) {
      console.error(`Submission not found: ${submissionId}`);
      return { success: false, error: 'Submission not found' };
    }
    
    return {
      success: true,
      hasTranscript: !!submission.transcript,
      transcriptLength: submission.transcript ? submission.transcript.length : 0,
      transcriptSample: submission.transcript ? submission.transcript.substring(0, 100) + '...' : null
    };
  } catch (err: any) {
    console.error('Error checking transcript:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Utility to manually update a submission's transcript
 */
export async function updateSubmissionTranscript(submissionId: string, transcript: string) {
  try {
    const updatedSubmission = await storage.updateSubmission(submissionId, {
      transcript
    });
    
    if (!updatedSubmission) {
      return { success: false, error: 'Failed to update submission' };
    }
    
    return {
      success: true,
      submission: {
        id: updatedSubmission._id,
        transcriptLength: transcript.length
      }
    };
  } catch (err: any) {
    console.error('Error updating transcript:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

/**
 * Save transcript to a debug file for analysis
 */
export function saveTranscriptToFile(transcript: string, submissionId: string) {
  try {
    const debugDir = path.join(__dirname, '../../debug');
    
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    const filename = `transcript_${submissionId}_${Date.now()}.txt`;
    const filePath = path.join(debugDir, filename);
    
    fs.writeFileSync(filePath, transcript);
    
    return {
      success: true,
      filePath,
      transcriptLength: transcript.length
    };
  } catch (err: any) {
    console.error('Error saving transcript to file:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
}

export default {
  checkSubmissionTranscript,
  updateSubmissionTranscript,
  saveTranscriptToFile
}; 