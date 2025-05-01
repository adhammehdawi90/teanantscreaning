import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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

interface VideoAnalysisChartsProps {
  analysis: VideoAnalysisResult;
}

// Helper function to convert text assessment to numerical score
function textToScore(text: string): number {
  const scoreMap: Record<string, number> = {
    'excellent': 5,
    'very good': 4,
    'good': 3,
    'fair': 2,
    'poor': 1,
    'generic assessment of': 3, // Default for fallback responses
  };

  const lowerText = text.toLowerCase();
  for (const [key, value] of Object.entries(scoreMap)) {
    if (lowerText.includes(key)) {
      return value;
    }
  }
  return 3; // Default score
}

export function VideoAnalysisCharts({ analysis }: VideoAnalysisChartsProps) {
  // Prepare data for language proficiency chart
  const languageData = [
    { name: 'Clarity', score: textToScore(analysis.language_proficiency.clarity) },
    { name: 'Vocabulary', score: textToScore(analysis.language_proficiency.vocabulary) },
    { name: 'Grammar', score: textToScore(analysis.language_proficiency.grammar) },
    { name: 'Fluency', score: textToScore(analysis.language_proficiency.fluency) },
    { name: 'Effectiveness', score: textToScore(analysis.language_proficiency.effectiveness) },
  ];

  // Prepare data for behavioral analysis radar chart
  const behavioralData = [
    { subject: 'Non-verbal', A: textToScore(analysis.behavioral_analysis.non_verbal), fullMark: 5 },
    { subject: 'Active Listening', A: textToScore(analysis.behavioral_analysis.active_listening), fullMark: 5 },
    { subject: 'Engagement', A: textToScore(analysis.behavioral_analysis.engagement), fullMark: 5 },
  ];

  // Prepare data for attitude assessment pie chart
  const attitudeData = [
    { name: 'Professionalism', value: textToScore(analysis.attitude_assessment.professionalism) },
    { name: 'Enthusiasm', value: textToScore(analysis.attitude_assessment.enthusiasm) },
    { name: 'Positivity', value: textToScore(analysis.attitude_assessment.positivity) },
    { name: 'Critical Thinking', value: textToScore(analysis.attitude_assessment.critical_thinking) },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="space-y-8">
      {/* Overall Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Score</h3>
        <div className="flex items-center justify-center">
          <div className="text-4xl font-bold text-blue-600">
            {analysis.overall_score}/10
          </div>
        </div>
      </div>

      {/* Language Proficiency Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Language Proficiency</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={languageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Behavioral Analysis Radar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Behavioral Analysis</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={behavioralData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={30} domain={[0, 5]} />
              <Radar
                name="Score"
                dataKey="A"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attitude Assessment Pie Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Attitude Assessment</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={attitudeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {attitudeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 