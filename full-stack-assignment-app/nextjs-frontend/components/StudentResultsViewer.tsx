'use client';

import { useState, useEffect } from 'react';
import { Users, Trophy, Clock, CheckCircle, X, FileText, BarChart3, Check, Pencil } from 'lucide-react';

// Types
interface AssignmentQuestion {
  question: string;
  options: string[];
  correctOptions: number[];
  explanation: string;
  points: number;
}

interface Assignment {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  title: string;
  questions: { [key: string]: AssignmentQuestion };
  createdAt: string;
  totalQuestions: number;
  status: string;
  type: string;
}

interface StudentResponse {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  userAssignmentResponse: number[];
  submittedAt: string;
  status: string;
  type: string;
}

interface StudentResultsViewerProps {
  assignment: Assignment;
  onCloseAction: () => void;
}

export const StudentResultsViewer = ({ assignment, onCloseAction }: StudentResultsViewerProps) => {
  const [studentResponses, setStudentResponses] = useState<StudentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentResponse | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);

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

  const calculateStudentScore = (studentResponse: StudentResponse): { score: number; totalPoints: number; percentage: number } => {
    if (!studentResponse.userAssignmentResponse || !assignment.questions) {
      return { score: 0, totalPoints: 0, percentage: 0 };
    }

    let score = 0;
    let totalPoints = 0;

    Object.values(assignment.questions).forEach((question, index) => {
      totalPoints += question.points;
      
      const userAnswer = studentResponse.userAssignmentResponse[index];
      const correctAnswers = question.correctOptions;
      
      // For single answer questions
      if (correctAnswers.length === 1) {
        if (userAnswer === correctAnswers[0]) {
          score += question.points;
        }
      } else {
        // For multiple answer questions (basic scoring - could be enhanced)
        if (correctAnswers.includes(userAnswer)) {
          score += question.points;
        }
      }
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    return { score, totalPoints, percentage };
  };

  const getLetterGrade = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const calculateClassStats = () => {
    if (studentResponses.length === 0) {
      return { average: 0, highest: 0, lowest: 0, totalSubmissions: 0 };
    }

    const scores = studentResponses.map(response => {
      const { percentage } = calculateStudentScore(response);
      return percentage;
    });

    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    return {
      average: Math.round(average),
      highest,
      lowest,
      totalSubmissions: studentResponses.length
    };
  };

  const stats = calculateClassStats();

  if (loading) {
    return (
      <div className="p-6 max-h-[90vh] overflow-y-auto text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading student responses...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-h-[90vh] overflow-y-auto">
      {/* Header - matching AssignmentCreator style */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-teal-800 mb-2">Student Results</h1>
          <p className="text-gray-700 font-medium">{assignment.title}</p>
        </div>
        <button
          onClick={onCloseAction}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Close"
        >
          <X className="h-6 w-6 text-gray-500" />
        </button>
      </div>

      {/* Assignment Info - matching AssignmentCreator blue background style */}
      <div className="mb-6 p-4 bg-blue-50 rounded-md border">
        <h3 className="text-teal-800 font-medium mb-3">Assignment Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="min-w-0">
            <div className="font-medium text-gray-700">Assignment ID</div>
            <div className="text-gray-600 break-all text-xs">{assignment.assignmentId}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Total Questions</div>
            <div className="text-gray-600">{Object.keys(assignment.questions).length}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Total Points</div>
            <div className="text-gray-600">
              {Object.values(assignment.questions).reduce((sum, q) => sum + q.points, 0)}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Created</div>
            <div className="text-gray-600">{new Date(assignment.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Class Statistics - using white cards with borders like questions */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-teal-800 mb-4">Class Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-gray-200 p-4 rounded-md bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-teal-600 flex-shrink-0" />
              <span className="font-medium text-teal-800">Submissions</span>
            </div>
            <div className="text-2xl font-bold text-teal-600">{stats.totalSubmissions}</div>
          </div>

          <div className="border border-gray-200 p-4 rounded-md bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <span className="font-medium text-teal-800">Average</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.average}%</div>
          </div>

          <div className="border border-gray-200 p-4 rounded-md bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <span className="font-medium text-teal-800">Highest</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{stats.highest}%</div>
          </div>

          <div className="border border-gray-200 p-4 rounded-md bg-white shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="font-medium text-teal-800">Lowest</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.lowest}%</div>
          </div>
        </div>
      </div>

      {/* Toggle Detailed View */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-teal-800">
          Individual Results ({studentResponses.length} submissions)
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetailedView(!showDetailedView)}
            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            title="Toggle detailed view"
          >
            {showDetailedView ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
          </button>
          <span className="text-sm text-gray-600">
            {showDetailedView ? 'Hide Details' : 'Show Details'}
          </span>
        </div>
      </div>

      {/* Student Responses */}
      {studentResponses.length === 0 ? (
        <div className="border border-gray-200 p-8 rounded-md bg-white shadow-sm text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No submissions yet</h3>
          <p className="text-gray-500">Students haven't submitted responses for this assignment yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {studentResponses.map((response, index) => {
            const { score, totalPoints, percentage } = calculateStudentScore(response);
            const letterGrade = getLetterGrade(percentage);
            const isSelected = selectedStudent === response;

            return (
              <div
                key={`${response.userId}-${response.assignmentId}`}
                className="border border-gray-200 p-4 rounded-md bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedStudent(isSelected ? null : response)}
              >
                {/* Student Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="text-lg font-semibold text-teal-800 truncate">
                        Student: {response.userId}
                      </h4>
                      <div className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${
                        percentage >= 90 ? 'bg-green-100 text-green-800' :
                        percentage >= 80 ? 'bg-blue-100 text-blue-800' :
                        percentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        percentage >= 60 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Grade: {letterGrade}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="whitespace-nowrap">Score: {score}/{totalPoints} points ({percentage}%)</span>
                      <span className="hidden sm:inline text-gray-400">•</span>
                      <span className="whitespace-nowrap">Submitted: {new Date(response.submittedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-teal-600">{percentage}%</div>
                      <div className="text-sm text-gray-500">{score}/{totalPoints}</div>
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                </div>

                {/* Detailed Response View - only show if detailed view is enabled and student is selected */}
                {showDetailedView && isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-teal-800 mb-3">Detailed Responses</h4>
                    <div className="space-y-4">
                      {Object.entries(assignment.questions).map(([questionKey, question], qIndex) => {
                        const userAnswer = response.userAssignmentResponse[qIndex];
                        const isCorrect = question.correctOptions.includes(userAnswer);

                        return (
                          <div key={questionKey} className="bg-gray-50 rounded-md p-3 border">
                            <div className="font-medium text-gray-800 mb-2">
                              <span className="text-teal-700">Question {qIndex + 1}:</span> {question.question}
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className={`flex items-center gap-2 p-2 rounded ${
                                isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}>
                                <span className="font-medium">Student Answer:</span>
                                <span>
                                  {userAnswer !== undefined && userAnswer !== -1 
                                    ? question.options[userAnswer] 
                                    : 'No answer'}
                                </span>
                                {isCorrect ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <X className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                              {!isCorrect && (
                                <div className="bg-green-50 text-green-700 p-2 rounded">
                                  <span className="font-medium">Correct Answer(s): </span>
                                  <span>
                                    {question.correctOptions.map(index => question.options[index]).join(', ')}
                                  </span>
                                </div>
                              )}
                              <div className="text-gray-600 p-2">
                                <span className="font-medium">Points Earned: </span>
                                {isCorrect ? question.points : 0}/{question.points}
                              </div>
                              {question.explanation && (
                                <div className="bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-200">
                                  <span className="font-medium">Explanation: </span>
                                  {question.explanation}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons - matching AssignmentCreator style */}
      <div className="flex justify-between gap-4 mt-6">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded transition bg-red-400 text-white hover:bg-red-500"
        >
          Print Results
        </button>
        <button
          onClick={onCloseAction}
          className="flex items-center gap-2 px-4 py-2 rounded transition bg-teal-600 text-white hover:bg-teal-700"
        >
          <X size={20}/>
          Close
        </button>
      </div>
    </div>
  );
};