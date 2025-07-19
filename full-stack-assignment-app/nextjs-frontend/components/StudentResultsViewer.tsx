'use client';

import { useState, useEffect } from 'react';
import { Users, Trophy, Clock, CheckCircle, X, FileText, BarChart3 } from 'lucide-react';

// Types
interface AssignmentQuestion {
  question: string;
  options: string[];
  correctOptions: number[];
  explanation: string;
  points: number;
}

interface Assignment {
  assignmentId: string;
  title: string;
  questions: { [key: string]: AssignmentQuestion };
  createdAt: string;
  totalQuestions: number;
  status: string;
}

interface StudentResponse {
  responseId: string;
  studentId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  responses: number[];
  submittedAt: string;
  status: string;
}

interface StudentResultsViewerProps {
  assignment: Assignment;
  onCloseAction: () => void;
}

export const StudentResultsViewer = ({ assignment, onCloseAction }: StudentResultsViewerProps) => {
  const [studentResponses, setStudentResponses] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentResponse | null>(null);

  // Debug log to check assignment data
  useEffect(() => {
    console.log('Assignment data received:', assignment);
    console.log('Assignment questions:', assignment?.questions);
    fetchStudentResponses();
  }, [assignment.assignmentId]);

  const fetchStudentResponses = async () => {
    try {
      console.log('Fetching responses for assignment:', assignment.assignmentId);
      
      const response = await fetch(
        `/api/assignment-responses?action=get-all-responses&assignmentId=${assignment.assignmentId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('Student responses received:', data.responses);
        setStudentResponses(data.responses || []);
      } else {
        console.error('Failed to fetch student responses:', response.status);
        setStudentResponses([]);
      }
    } catch (error) {
      console.error('Error fetching student responses:', error);
      setStudentResponses([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (studentResponse: StudentResponse): number => {
    if (!assignment.questions || typeof assignment.questions !== 'object') {
      return 0;
    }
    
    let score = 0;
    Object.entries(assignment.questions).forEach(([key, question], index) => {
      if (!question || !studentResponse.responses || !Array.isArray(studentResponse.responses)) {
        return;
      }
      
      const studentAnswer = studentResponse.responses[index];
      if (question.correctOptions && Array.isArray(question.correctOptions) && 
          question.correctOptions.includes(studentAnswer)) {
        score += question.points || 0;
      }
    });
    return score;
  };

  const getTotalPoints = (): number => {
    if (!assignment.questions || typeof assignment.questions !== 'object') {
      return 0;
    }
    return Object.values(assignment.questions).reduce((total, q) => {
      return total + (q?.points || 0);
    }, 0);
  };

  const getScorePercentage = (score: number): number => {
    const total = getTotalPoints();
    return total > 0 ? Math.round((score / total) * 100) : 0;
  };

  const getGradeColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeBgColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-green-50 border-green-200';
    if (percentage >= 80) return 'bg-blue-50 border-blue-200';
    if (percentage >= 70) return 'bg-yellow-50 border-yellow-200';
    if (percentage >= 60) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getAverageScore = (): number => {
    if (studentResponses.length === 0 || !assignment.questions) return 0;
    const totalScore = studentResponses.reduce((sum, response) => sum + calculateScore(response), 0);
    return Math.round(totalScore / studentResponses.length);
  };

  const getAveragePercentage = (): number => {
    if (studentResponses.length === 0 || !assignment.questions) return 0;
    const totalPercentage = studentResponses.reduce((sum, response) => {
      const score = calculateScore(response);
      return sum + getScorePercentage(score);
    }, 0);
    return Math.round(totalPercentage / studentResponses.length);
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-teal-800 mb-2">Student Results</h1>
            <h2 className="text-lg text-gray-700">{assignment?.title || 'Assignment Results'}</h2>
            
            {/* Debug info for troubleshooting */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
                <p>Debug: Assignment ID: {assignment?.assignmentId}</p>
                <p>Questions count: {assignment?.questions ? Object.keys(assignment.questions).length : 'No questions data'}</p>
                <p>Questions object: {assignment?.questions ? 'Available' : 'Missing'}</p>
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {assignment.questions ? Object.keys(assignment.questions).length : 0} questions
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="h-4 w-4" />
                {getTotalPoints()} total points
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {studentResponses.length} submissions
              </span>
            </div>
          </div>
          <button
            onClick={onCloseAction}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Statistics */}
        {studentResponses.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="text-blue-900 font-medium">Class Average</span>
              </div>
              <p className="text-2xl font-bold text-blue-800 mt-1">
                {getAverageScore()}/{getTotalPoints()} ({getAveragePercentage()}%)
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-600" />
                <span className="text-green-900 font-medium">Highest Score</span>
              </div>
              <p className="text-2xl font-bold text-green-800 mt-1">
                {studentResponses.length > 0 ? Math.max(...studentResponses.map(r => calculateScore(r))) : 0}/{getTotalPoints()}
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                <span className="text-gray-900 font-medium">Total Submissions</span>
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-1">{studentResponses.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading student results...</p>
        </div>
      ) : studentResponses.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No student submissions yet</p>
          <p className="text-gray-500 text-sm mt-2">Results will appear here once students submit their assignments</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Submissions</h3>
          
          {studentResponses.map((response) => {
            const score = calculateScore(response);
            const percentage = getScorePercentage(score);
            
            return (
              <div
                key={response.responseId}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${getGradeBgColor(percentage)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        Student: {response.studentId}
                      </h4>
                      <span className={`font-bold text-lg ${getGradeColor(percentage)}`}>
                        {score}/{getTotalPoints()} ({percentage}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Submitted: {new Date(response.submittedAt).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Status: {response.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(response)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed View Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Detailed Results - {selectedStudent.studentId}
                </h3>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {assignment.questions && Object.entries(assignment.questions).map(([questionKey, question], index) => {
                  if (!question || !selectedStudent.responses || !Array.isArray(selectedStudent.responses)) {
                    return null;
                  }
                  
                  const studentAnswer = selectedStudent.responses[index];
                  const isCorrect = question.correctOptions && Array.isArray(question.correctOptions) && 
                                   question.correctOptions.includes(studentAnswer);

                  return (
                    <div key={questionKey} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Question {index + 1} ({question.points} points)
                      </h4>
                      <p className="text-gray-800 mb-3">{question.question}</p>

                      <div className="space-y-2">
                        {question.options && Array.isArray(question.options) && question.options.map((option, optionIndex) => {
                          const isStudentChoice = studentAnswer === optionIndex;
                          const isCorrectOption = question.correctOptions && Array.isArray(question.correctOptions) && 
                                                 question.correctOptions.includes(optionIndex);

                          return (
                            <div
                              key={optionIndex}
                              className={`p-2 rounded border-2 ${
                                isCorrectOption
                                  ? 'border-green-500 bg-green-50'
                                  : isStudentChoice
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{option}</span>
                                <div className="flex items-center gap-2">
                                  {isCorrectOption && (
                                    <span className="text-green-600 text-sm font-medium">Correct</span>
                                  )}
                                  {isStudentChoice && !isCorrectOption && (
                                    <span className="text-red-600 text-sm font-medium">Student Choice</span>
                                  )}
                                  {isStudentChoice && isCorrectOption && (
                                    <span className="text-green-600 text-sm font-medium">Student Choice ✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className={`font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {isCorrect ? `Correct (+${question.points || 0} points)` : 'Incorrect (0 points)'}
                        </span>
                      </div>

                      {question.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <h5 className="font-medium text-blue-900 mb-1">Explanation:</h5>
                          <p className="text-blue-800 text-sm">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Final Score</h4>
                <p className="text-2xl font-bold text-teal-600">
                  {calculateScore(selectedStudent)}/{getTotalPoints()} 
                  ({getScorePercentage(calculateScore(selectedStudent))}%)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};