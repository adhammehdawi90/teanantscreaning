import React from 'react';
import { VideoAnalysisCharts } from './video-analysis-charts';

interface VideoAnalysisResult {
  summary: string;
  overall_score: number;
  language_proficiency: {
    clarity: string;
    vocabulary: string;
    grammar: string;
    fluency: string;
    effectiveness: string;
  };
  behavioral_analysis: {
    non_verbal: string;
    active_listening: string;
    engagement: string;
  };
  attitude_assessment: {
    professionalism: string;
    enthusiasm: string;
    positivity: string;
    critical_thinking: string;
  };
}

interface VideoAnalysisDisplayProps {
  analysis: VideoAnalysisResult;
}

export function VideoAnalysisDisplay({ analysis }: VideoAnalysisDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Analysis Summary</h2>
        <p className="text-gray-700">{analysis.summary}</p>
      </div>

      {/* Charts Section */}
      <VideoAnalysisCharts analysis={analysis} />

      {/* Detailed Analysis Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Language Proficiency */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Language Proficiency</h3>
          <ul className="space-y-2">
            <li>
              <span className="font-medium">Clarity:</span> {analysis.language_proficiency.clarity}
            </li>
            <li>
              <span className="font-medium">Vocabulary:</span> {analysis.language_proficiency.vocabulary}
            </li>
            <li>
              <span className="font-medium">Grammar:</span> {analysis.language_proficiency.grammar}
            </li>
            <li>
              <span className="font-medium">Fluency:</span> {analysis.language_proficiency.fluency}
            </li>
            <li>
              <span className="font-medium">Effectiveness:</span> {analysis.language_proficiency.effectiveness}
            </li>
          </ul>
        </div>

        {/* Behavioral Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Behavioral Analysis</h3>
          <ul className="space-y-2">
            <li>
              <span className="font-medium">Non-verbal:</span> {analysis.behavioral_analysis.non_verbal}
            </li>
            <li>
              <span className="font-medium">Active Listening:</span> {analysis.behavioral_analysis.active_listening}
            </li>
            <li>
              <span className="font-medium">Engagement:</span> {analysis.behavioral_analysis.engagement}
            </li>
          </ul>
        </div>

        {/* Attitude Assessment */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Attitude Assessment</h3>
          <ul className="space-y-2">
            <li>
              <span className="font-medium">Professionalism:</span> {analysis.attitude_assessment.professionalism}
            </li>
            <li>
              <span className="font-medium">Enthusiasm:</span> {analysis.attitude_assessment.enthusiasm}
            </li>
            <li>
              <span className="font-medium">Positivity:</span> {analysis.attitude_assessment.positivity}
            </li>
            <li>
              <span className="font-medium">Critical Thinking:</span> {analysis.attitude_assessment.critical_thinking}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
} 