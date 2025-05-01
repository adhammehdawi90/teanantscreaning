import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VideoAnalysisChartsProps {
  analysis: {
    overall_score: number;
    summary: string;
    participation_level?: {
      speaking_time_percentage: string;
      silence_periods: string;
      score: number;
    };
    language_proficiency: {
      clarity: { assessment: string; score: number } | string;
      vocabulary: { assessment: string; score: number } | string;
      grammar: { assessment: string; score: number } | string;
      fluency: { assessment: string; score: number } | string;
      effectiveness: { assessment: string; score: number } | string;
      notes?: string;
    };
    behavioral_analysis: {
      non_verbal: { assessment: string; score: number } | string;
      active_listening: { assessment: string; score: number } | string;
      engagement: { assessment: string; score: number } | string;
      notes?: string;
    };
    attitude_assessment: {
      professionalism: { assessment: string; score: number } | string;
      enthusiasm: { assessment: string; score: number } | string;
      positivity: { assessment: string; score: number } | string;
      critical_thinking: { assessment: string; score: number } | string;
      notes?: string;
    };
    critical_flags?: string[];
    final_recommendation?: string;
    specific_feedback?: {
      clarity?: string;
      vocabulary?: string;
      grammar?: string;
      fluency?: string;
      effectiveness?: string;
      non_verbal?: string;
      active_listening?: string;
      engagement?: string;
      professionalism?: string;
      enthusiasm?: string;
      positivity?: string;
      critical_thinking?: string;
    };
    seniority_level?: string;
  };
}

// Helper function to convert text assessment to numerical score
function textToScore(text: any): number {
  // If it's already a number, return it
  if (typeof text === 'number') {
    return text;
  }
  
  // If it's an object with a score property, return that
  if (text && typeof text === 'object' && 'score' in text) {
    return text.score;
  }
  
  // If it's a string, use the mapping
  if (typeof text === 'string') {
    const scoreMap: Record<string, number> = {
      "excellent": 5,
      "very good": 4,
      "good": 3,
      "fair": 2,
      "poor": 1,
      "needs improvement": 1
    };
    return scoreMap[text.toLowerCase()] || 3;
  }
  
  // Default fallback
  return 3;
}

// Score Card Component with better type safety
interface ScoreCardProps {
  value: string | number;
  label: string;
  color: string;
  percentage?: number;
}

function ScoreCard({ value, label, color, percentage = 100 }: ScoreCardProps) {
  // Ensure the displayed value is a string
  const displayValue = typeof value === 'string' ? value : String(value);
  // Ensure percentage is a number
  const safePercentage = typeof percentage === 'number' ? percentage : 0;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Circle background */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e6e6e6"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * safePercentage) / 100}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-xl font-bold">{displayValue}</span>
        </div>
      </div>
      <p className="mt-1 text-xs font-medium text-center">{label}</p>
    </div>
  );
}

// Seniority Level Meter Component
function SeniorityMeter({ overallScore }: { overallScore: number }) {
  // Determine seniority level based on overall score
  let seniorityLevel: string;
  let levelPercentage: number;
  let bgColor: string;
  let levelDescription: string;
  
  if (overallScore >= 9) {
    seniorityLevel = "Senior";
    levelPercentage = 90;
    bgColor = "bg-purple-600";
    levelDescription = "Expert-level knowledge with exceptional problem-solving abilities";
  } else if (overallScore >= 7) {
    seniorityLevel = "Mid-Senior";
    levelPercentage = 75;
    bgColor = "bg-blue-600";
    levelDescription = "Strong technical skills with good leadership potential";
  } else if (overallScore >= 5) {
    seniorityLevel = "Mid-level";
    levelPercentage = 50;
    bgColor = "bg-green-600";
    levelDescription = "Solid understanding with moderate experience";
  } else if (overallScore >= 3) {
    seniorityLevel = "Junior";
    levelPercentage = 25;
    bgColor = "bg-yellow-500";
    levelDescription = "Basic knowledge with developing practical skills";
  } else {
    seniorityLevel = "Entry";
    levelPercentage = 10;
    bgColor = "bg-red-500";
    levelDescription = "Foundational understanding requiring significant guidance";
  }
  
  const levels = ["Entry", "Junior", "Mid-level", "Mid-Senior", "Senior"];
  
  return (
    <div className="mt-8 mb-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Seniority Assessment</h3>
        <Badge className={`px-3 py-1 ${bgColor.replace('bg-', 'bg-')} text-white`}>
          {seniorityLevel}
        </Badge>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">{levelDescription}</p>
      
      {/* Seniority Level Meter */}
      <div className="w-full h-6 bg-gray-200 rounded-full relative mb-2">
        <div 
          className={`h-full rounded-full ${bgColor}`} 
          style={{ width: `${levelPercentage}%` }}
        ></div>
        
        {/* Level markers */}
        <div className="absolute top-8 left-0 right-0 flex justify-between">
          {levels.map((level, index) => (
            <div key={level} className="flex flex-col items-center">
              <div className={`w-1 h-3 -mt-3 ${
                (index + 1) * 20 <= levelPercentage ? bgColor : 'bg-gray-300'
              }`}></div>
              <span className={`text-xs mt-1 ${
                level === seniorityLevel ? 'font-bold' : 'text-gray-500'
              }`}>
                {level}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-8">
        <h4 className="text-sm font-medium mb-2">Key indicators:</h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-gray-100">Technical depth</Badge>
          <Badge variant="outline" className="bg-gray-100">Problem solving</Badge>
          <Badge variant="outline" className="bg-gray-100">Communication</Badge>
          <Badge variant="outline" className="bg-gray-100">Experience</Badge>
          <Badge variant="outline" className="bg-gray-100">Leadership</Badge>
        </div>
      </div>
    </div>
  );
}

// Enhanced Category Section Component
function CategorySection({ title, active, onClick }: { title: string; active: boolean; onClick: () => void }) {
  return (
    <div 
      className={`flex-1 py-2 text-center border-b-2 cursor-pointer transition-colors ${
        active ? "border-blue-500 text-blue-600 font-medium" : "border-transparent hover:text-blue-500"
      }`}
      onClick={onClick}
    >
      {title}
    </div>
  );
}

// Helper function to get text from either string or object format
function getAssessmentText(field: any): string {
  if (typeof field === 'object' && field && 'assessment' in field) {
    return field.assessment;
  }
  return typeof field === 'string' ? field : '';
}

// Enhanced Assessment Item Component
function AssessmentItem({ 
  attribute, 
  rating, 
  specificFeedback
}: { 
  attribute: string; 
  rating: any; 
  specificFeedback?: string;
}) {
  const score = textToScore(rating);
  const percentage = (score / 5) * 100;
  
  // Get the text assessment
  const ratingText = getAssessmentText(rating);
  
  // Generate assessment badge content based on the attribute and score
  const getBadgeContent = (attr: string, score: number) => {
    const assessments: Record<string, Record<number, string>> = {
      "Clarity": {
        5: "Exceptionally clear and articulate",
        4: "Very clear with minimal hesitations",
        3: "Mostly clear, but some mumbling and hesitations",
        2: "Somewhat unclear with frequent hesitations",
        1: "Difficult to understand"
      },
      "Vocabulary": {
        5: "Advanced technical vocabulary",
        4: "Strong vocabulary with precise terms",
        3: "Appropriate for the technical context",
        2: "Limited technical vocabulary",
        1: "Inadequate vocabulary"
      },
      "Grammar": {
        5: "Error-free grammar",
        4: "Nearly perfect grammar",
        3: "Generally accurate with some minor errors",
        2: "Several grammatical errors",
        1: "Frequent grammatical errors"
      },
      "Fluency": {
        5: "Completely fluent with natural flow",
        4: "Speaks smoothly with minimal pauses",
        3: "Fairly fluent, but has several pauses and uses filler words",
        2: "Noticeable breaks in speech",
        1: "Very disjointed speech"
      },
      "Effectiveness": {
        5: "Exceptionally effective communication",
        4: "Highly effective in conveying ideas",
        3: "Generally effective in conveying technical concepts, but could be more concise",
        2: "Somewhat ineffective communication",
        1: "Ineffective communication"
      },
      "default": {
        5: "Excellent",
        4: "Very Good",
        3: "Good",
        2: "Fair",
        1: "Needs Improvement"
      }
    };
    
    return assessments[attr]?.[score] || assessments["default"][score] || ratingText;
  };
  
  const badgeContent = getBadgeContent(attribute, score);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{attribute}</span>
      </div>
      <div className="relative w-full mb-2">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${
              score >= 4 ? "bg-blue-500" : score >= 3 ? "bg-blue-400" : "bg-red-400"
            }`} 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
      <div className="flex justify-between items-start mt-1">
        <p className="text-xs text-gray-600">
          {specificFeedback || ratingText || `Acceptable ${attribute.toLowerCase()}, with room for improvement.`}
        </p>
        <Badge 
          variant="outline" 
          className={`ml-2 whitespace-nowrap ${
            score >= 4 ? "bg-blue-100 text-blue-700" : 
            score >= 3 ? "bg-blue-50 text-blue-600" : 
            "bg-red-50 text-red-600"
          }`}
        >
          {typeof badgeContent === 'string' ? badgeContent : ''}
        </Badge>
      </div>
    </div>
  );
}

export function VideoAnalysisCharts({ analysis }: VideoAnalysisChartsProps) {
  const [activeCategory, setActiveCategory] = useState("language");
  
  // Console log the analysis structure to help debug
  useEffect(() => {
    console.log('Analysis structure:', JSON.stringify(analysis, null, 2));
  }, [analysis]);
  
  // Ensure we have a safe analysis object with stringified content
  const ensureSafeValue = (value: any) => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object' && value !== null) {
      if ('assessment' in value && 'score' in value) {
        return value;
      }
      return JSON.stringify(value);
    }
    return value;
  };
  
  // Extract values safely to prevent rendering objects directly
  const safeAnalysis = {
    summary: typeof analysis.summary === 'string' ? analysis.summary : '',
    overall_score: typeof analysis.overall_score === 'number' ? analysis.overall_score : 0,
    participation_level: analysis.participation_level ? {
      speaking_time_percentage: ensureSafeValue(analysis.participation_level.speaking_time_percentage),
      silence_periods: ensureSafeValue(analysis.participation_level.silence_periods),
      score: typeof analysis.participation_level.score === 'number' ? analysis.participation_level.score : 0
    } : undefined,
    language_proficiency: {
      clarity: ensureSafeValue(analysis.language_proficiency.clarity),
      vocabulary: ensureSafeValue(analysis.language_proficiency.vocabulary),
      grammar: ensureSafeValue(analysis.language_proficiency.grammar),
      fluency: ensureSafeValue(analysis.language_proficiency.fluency),
      effectiveness: ensureSafeValue(analysis.language_proficiency.effectiveness),
      notes: typeof analysis.language_proficiency === 'object' && analysis.language_proficiency.notes ? 
        String(analysis.language_proficiency.notes) : ''
    },
    behavioral_analysis: {
      non_verbal: ensureSafeValue(analysis.behavioral_analysis.non_verbal),
      active_listening: ensureSafeValue(analysis.behavioral_analysis.active_listening),
      engagement: ensureSafeValue(analysis.behavioral_analysis.engagement),
      notes: typeof analysis.behavioral_analysis === 'object' && analysis.behavioral_analysis.notes ? 
        String(analysis.behavioral_analysis.notes) : ''
    },
    attitude_assessment: {
      professionalism: ensureSafeValue(analysis.attitude_assessment.professionalism),
      enthusiasm: ensureSafeValue(analysis.attitude_assessment.enthusiasm),
      positivity: ensureSafeValue(analysis.attitude_assessment.positivity),
      critical_thinking: ensureSafeValue(analysis.attitude_assessment.critical_thinking),
      notes: typeof analysis.attitude_assessment === 'object' && analysis.attitude_assessment.notes ? 
        String(analysis.attitude_assessment.notes) : ''
    },
    critical_flags: Array.isArray(analysis.critical_flags) ? analysis.critical_flags.map(flag => 
      typeof flag === 'string' ? flag : String(flag)
    ) : [],
    final_recommendation: typeof analysis.final_recommendation === 'string' ? 
      analysis.final_recommendation : '',
    specific_feedback: analysis.specific_feedback
  };
  
  // Calculate average scores for each category
  const languageAvg = Math.round((
    textToScore(safeAnalysis.language_proficiency.clarity) +
    textToScore(safeAnalysis.language_proficiency.vocabulary) +
    textToScore(safeAnalysis.language_proficiency.grammar) +
    textToScore(safeAnalysis.language_proficiency.fluency) +
    textToScore(safeAnalysis.language_proficiency.effectiveness)
  ) / 5 * 10) / 10;
  
  const behavioralAvg = Math.round((
    textToScore(safeAnalysis.behavioral_analysis.non_verbal) +
    textToScore(safeAnalysis.behavioral_analysis.active_listening) +
    textToScore(safeAnalysis.behavioral_analysis.engagement)
  ) / 3 * 10) / 10;
  
  const attitudeAvg = Math.round((
    textToScore(safeAnalysis.attitude_assessment.professionalism) +
    textToScore(safeAnalysis.attitude_assessment.enthusiasm) +
    textToScore(safeAnalysis.attitude_assessment.positivity) +
    textToScore(safeAnalysis.attitude_assessment.critical_thinking)
  ) / 4 * 10) / 10;

  // Get notes from the analysis
  const languageNotes = safeAnalysis.language_proficiency.notes || '';
  const behavioralNotes = safeAnalysis.behavioral_analysis.notes || '';
  const attitudeNotes = safeAnalysis.attitude_assessment.notes || '';

  // Get feedback text from analysis or fallback to default
  const getFeedback = (key: string): string => {
    // Try to get from specific feedback
    if (safeAnalysis.specific_feedback && key in safeAnalysis.specific_feedback) {
      const feedback = safeAnalysis.specific_feedback[key as keyof typeof safeAnalysis.specific_feedback];
      return typeof feedback === 'string' ? feedback : '';
    }
    
    // Try to get from notes
    if (key.includes('clarity') || key.includes('vocabulary') || key.includes('grammar') || 
        key.includes('fluency') || key.includes('effectiveness')) {
      return languageNotes || '';
    }
    
    if (key.includes('non_verbal') || key.includes('active_listening') || key.includes('engagement')) {
      return behavioralNotes || '';
    }
    
    if (key.includes('professionalism') || key.includes('enthusiasm') || key.includes('positivity') || 
        key.includes('critical_thinking')) {
      return attitudeNotes || '';
    }
    
    return '';
  };

  return (
    <div className="space-y-6 border rounded-lg p-6">
      <h2 className="text-2xl font-bold">Interview Analysis</h2>
      
      {/* Analysis Summary */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Analysis Summary</h3>
        <p className="text-gray-700 mb-4">{typeof safeAnalysis.summary === 'string' ? safeAnalysis.summary : ''}</p>
        <div className="flex items-center">
          <span className="font-medium mr-2">Overall Score:</span>
          <Badge className="text-white bg-blue-500 px-3 py-1 rounded-full">
            {safeAnalysis.overall_score}/10
          </Badge>
        </div>
        
        {/* Critical Flags Section */}
        {safeAnalysis.critical_flags && safeAnalysis.critical_flags.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
            <h4 className="text-sm font-semibold text-red-700 mb-1">Critical Flags:</h4>
            <ul className="list-disc pl-5 space-y-1 text-xs text-red-800">
              {safeAnalysis.critical_flags.map((flag: any, index: number) => (
                <li key={index}>{typeof flag === 'string' ? flag : JSON.stringify(flag)}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Final Recommendation */}
        {safeAnalysis.final_recommendation && (
          <div className="mt-4 flex items-center">
            <span className="font-medium mr-2">Recommendation:</span>
            <Badge className={`text-white px-3 py-1 rounded-full ${
              safeAnalysis.final_recommendation.includes('REJECT') ? 'bg-red-500' : 
              safeAnalysis.final_recommendation.includes('RESERVATIONS') ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}>
              {typeof safeAnalysis.final_recommendation === 'string' ? safeAnalysis.final_recommendation : ''}
            </Badge>
          </div>
        )}
        
        {/* Participation Level */}
        {safeAnalysis.participation_level && (
          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
            <h4 className="text-sm font-semibold mb-1">Participation Level:</h4>
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span>Speaking Time:</span>
                <span className="font-medium">
                  {typeof safeAnalysis.participation_level.speaking_time_percentage === 'string' 
                    ? safeAnalysis.participation_level.speaking_time_percentage 
                    : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Silence Periods:</span>
                <span className="font-medium">
                  {typeof safeAnalysis.participation_level.silence_periods === 'string' 
                    ? safeAnalysis.participation_level.silence_periods 
                    : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Participation Score:</span>
                <span className="font-medium">
                  {typeof safeAnalysis.participation_level.score === 'number' 
                    ? `${safeAnalysis.participation_level.score}/10` 
                    : '0/10'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Score Cards Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Interview Performance Dashboard</h3>
        <div className="flex justify-between items-center flex-wrap gap-3">
          <ScoreCard 
            value={safeAnalysis.overall_score} 
            label="Overall Score" 
            color="#3B82F6" 
            percentage={safeAnalysis.overall_score * 10} 
          />
          <ScoreCard 
            value={`${languageAvg}/5`} 
            label="Language" 
            color="#8B5CF6" 
            percentage={languageAvg/5 * 100} 
          />
          <ScoreCard 
            value={`${behavioralAvg}/5`} 
            label="Behavior" 
            color="#10B981" 
            percentage={behavioralAvg/5 * 100} 
          />
          <ScoreCard 
            value={`${attitudeAvg}/5`} 
            label="Attitude" 
            color="#F59E0B" 
            percentage={attitudeAvg/5 * 100} 
          />
          <ScoreCard 
            value={Math.round((safeAnalysis.overall_score) * 10)} 
            label="Percentile" 
            color="#6366F1" 
            percentage={Math.round((safeAnalysis.overall_score) * 10)} 
          />
        </div>
      </div>
      
      {/* Seniority Level Meter */}
      <SeniorityMeter overallScore={safeAnalysis.overall_score} />
      
      {/* Category Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <CategorySection 
            title="Language Proficiency" 
            active={activeCategory === "language"} 
            onClick={() => setActiveCategory("language")} 
          />
          <CategorySection 
            title="Behavioral Analysis" 
            active={activeCategory === "behavioral"} 
            onClick={() => setActiveCategory("behavioral")} 
          />
          <CategorySection 
            title="Attitude Assessment" 
            active={activeCategory === "attitude"} 
            onClick={() => setActiveCategory("attitude")} 
          />
        </div>
      </div>
      
      {/* Language Proficiency Section */}
      {activeCategory === "language" && (
        <div className="mt-6">
          <AssessmentItem 
            attribute="Clarity" 
            rating={safeAnalysis.language_proficiency.clarity}
            specificFeedback={getFeedback("clarity")}
          />
          <AssessmentItem 
            attribute="Vocabulary" 
            rating={safeAnalysis.language_proficiency.vocabulary}
            specificFeedback={getFeedback("vocabulary")}
          />
          <AssessmentItem 
            attribute="Grammar" 
            rating={safeAnalysis.language_proficiency.grammar}
            specificFeedback={getFeedback("grammar")}
          />
          <AssessmentItem 
            attribute="Fluency" 
            rating={safeAnalysis.language_proficiency.fluency}
            specificFeedback={getFeedback("fluency")}
          />
          <AssessmentItem 
            attribute="Effectiveness" 
            rating={safeAnalysis.language_proficiency.effectiveness}
            specificFeedback={getFeedback("effectiveness")}
          />
        </div>
      )}
      
      {/* Behavioral Analysis Section */}
      {activeCategory === "behavioral" && (
        <div className="mt-6">
          <AssessmentItem 
            attribute="Non-verbal Communication" 
            rating={safeAnalysis.behavioral_analysis.non_verbal}
            specificFeedback={getFeedback("non_verbal")}
          />
          <AssessmentItem 
            attribute="Active Listening" 
            rating={safeAnalysis.behavioral_analysis.active_listening}
            specificFeedback={getFeedback("active_listening")}
          />
          <AssessmentItem 
            attribute="Engagement" 
            rating={safeAnalysis.behavioral_analysis.engagement}
            specificFeedback={getFeedback("engagement")}
          />
        </div>
      )}
      
      {/* Attitude Assessment Section */}
      {activeCategory === "attitude" && (
        <div className="mt-6">
          <AssessmentItem 
            attribute="Professionalism" 
            rating={safeAnalysis.attitude_assessment.professionalism}
            specificFeedback={getFeedback("professionalism")}
          />
          <AssessmentItem 
            attribute="Enthusiasm" 
            rating={safeAnalysis.attitude_assessment.enthusiasm}
            specificFeedback={getFeedback("enthusiasm")}
          />
          <AssessmentItem 
            attribute="Positivity" 
            rating={safeAnalysis.attitude_assessment.positivity}
            specificFeedback={getFeedback("positivity")}
          />
          <AssessmentItem 
            attribute="Critical Thinking" 
            rating={safeAnalysis.attitude_assessment.critical_thinking}
            specificFeedback={getFeedback("critical_thinking")}
          />
        </div>
      )}
      
      {/* Improvement Suggestions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-md font-semibold text-blue-700 mb-2">Improvement Suggestions</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-blue-800">
          <li>Practice answering technical questions more directly and concisely</li>
          <li>Consider reducing filler words and pauses when speaking</li>
          <li>Demonstrate more enthusiasm for the role and technologies</li>
          <li>Prepare more concrete examples of past experiences to share</li>
          <li>Maintain consistent eye contact throughout the interview</li>
        </ul>
      </div>
      
      {/* Strengths Section */}
      <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
        <h3 className="text-md font-semibold text-green-700 mb-2">Key Strengths</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-green-800">
          <li>Strong technical knowledge in the required areas</li>
          <li>Professional demeanor and presentation</li>
          <li>Good problem-solving approach with logical thinking</li>
          <li>Appropriate technical vocabulary for the role</li>
          <li>Effective communication of complex concepts</li>
        </ul>
      </div>
    </div>
  );
} 