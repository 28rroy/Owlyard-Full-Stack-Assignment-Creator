'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, FileText, AlertCircle, X, GraduationCap, Users } from 'lucide-react';
import { MathJax } from '@/components/MathJax';

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

interface AssignmentResponse {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  userAssignmentResponse: number[]; // UPDATED: new field name
  submittedAt: string;
  status: string;
  type: string;
}

interface AssignmentViewerProps {
  assignment: Assignment;
  studentId: string;
  assignmentOwnerId: string;
  onCloseAction: () => void;
}

export const AssignmentViewer = ({ assignment, studentId, assignmentOwnerId, onCloseAction }: AssignmentViewerProps) => {
  const [responses, setResponses] = useState<number[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [existingResponse, setExistingResponse] = useState<AssignmentResponse | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // Initialize responses array and check permissions
    const questionCount = Object.keys(assignment.questions).length;
    setResponses(new Array(questionCount).fill(-1));
    
    checkPermissions();
    checkExistingResponse();
  }, [assignment, studentId, assignmentOwnerId]);

  const checkPermissions = async () => {
    try {
      const response = await fetch(
        `/api/assignment-responses?action=check-permissions&userId=${studentId}&assignmentOwnerId=${assignmentOwnerId}`
      );
      const data = await response.json();
      setCanEdit(data.canEdit);
      console.log('Permissions check:', data);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const checkExistingResponse = async () => {
    try {
      // UPDATED: Use userId instead of studentId for the query
      const response = await fetch(
        `/api/assignment-responses?userId=${studentId}&assignmentId=${assignment.assignmentId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.response) {
          setExistingResponse(data.response);
          setResponses(data.response.userAssignmentResponse); // UPDATED: use new field name
          setIsSubmitted(true);
          // If student is owner, they can see results
          if (canEdit) {
            setShowResults(true);
          }
        }
      }
    } catch (error) {
      console.error('Error checking existing response:', error);
    }
  };

  const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted && !canEdit) return; // Can't edit if submitted and not owner
    
    const newResponses = [...responses];
    newResponses[questionIndex] = optionIndex;
    setResponses(newResponses);
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unanswered = responses.findIndex(r => r === -1);
    if (unanswered !== -1) {
      alert(`Please answer question ${unanswered + 1} before submitting.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // UPDATED: Use new payload structure per boss requirements
      const payload = {
        userId: studentId, // Using studentId as the userId
        assignmentId: assignment.assignmentId,
        assignmentOwnerId: assignmentOwnerId,
        userAssignmentResponse: responses // UPDATED: new field name for array containing selected options
      };

      console.log('Submitting assignment response:', payload);

      const response = await fetch('/api/assignment-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Assignment submitted successfully:', data);
        alert('Assignment submitted successfully!');
        setIsSubmitted(true);
        
        // If student is owner, show results immediately
        if (canEdit) {
          setShowResults(true);
        }
      } else {
        const error = await response.json();
        console.error('Submission failed:', error);
        alert(`Failed to submit assignment: ${error.error}`);
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQuestionType = (question: AssignmentQuestion): string => {
    return question.correctOptions.length > 1 ? 'Multiple answers' : 'Single answer';
  };

  const calculateScore = (): { score: number; totalPoints: number } => {
    if (!showResults || !isSubmitted) return { score: 0, totalPoints: 0 };

    let score = 0;
    let totalPoints = 0;

    Object.values(assignment.questions).forEach((question, index) => {
      totalPoints += question.points;
      
      const userAnswer = responses[index];
      const correctAnswers = question.correctOptions;
      
      // For single answer questions
      if (correctAnswers.length === 1) {
        if (userAnswer === correctAnswers[0]) {
          score += question.points;
        }
      } else {
        // For multiple answer questions (more complex scoring could be implemented)
        if (correctAnswers.includes(userAnswer)) {
          score += question.points;
        }
      }
    });

    return { score, totalPoints };
  };

  const { score, totalPoints } = calculateScore();

  return (
    <div className="p-6 max-h-[80vh] overflow-y-auto">
      {/* Header - matching AssignmentCreator style */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-teal-800 mb-2">{assignment.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {Object.keys(assignment.questions).length} questions
            </span>
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Student: {studentId}
            </span>
            {existingResponse && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                Submitted: {new Date(existingResponse.submittedAt).toLocaleString()}
              </span>
            )}
          </div>
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
          <div>
            <div className="font-medium text-gray-700">Assignment Owner</div>
            <div className="text-gray-600">{assignment.assignmentOwnerId}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Created</div>
            <div className="text-gray-600">{new Date(assignment.createdAt).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Total Points</div>
            <div className="text-gray-600">{Object.values(assignment.questions).reduce((sum, q) => sum + q.points, 0)}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Can Edit</div>
            <div className="text-gray-600">{canEdit ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>

      {/* Score Display - matching AssignmentCreator style */}
      {showResults && isSubmitted && (
        <div className="mb-6 p-4 bg-green-50 rounded-md border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Your Results</h3>
          <div className="text-2xl font-bold text-green-600">
            {score} / {totalPoints} points ({Math.round((score / totalPoints) * 100)}%)
          </div>
        </div>
      )}

      {/* Questions - matching AssignmentCreator question card style */}
      <div className="space-y-6">
        {Object.entries(assignment.questions).map(([questionKey, question], index) => (
          <div
            key={questionKey}
            className={`border border-gray-200 p-4 rounded-md bg-white shadow-sm ${
              isSubmitted && !canEdit ? 'bg-gray-50' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-teal-800">
                Question {index + 1}
                <span className="ml-2 text-sm text-gray-500 font-normal">
                  ({question.points} point{question.points !== 1 ? 's' : ''})
                </span>
              </h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                question.correctOptions.length > 1
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {getQuestionType(question)}
              </span>
            </div>

            <div className="text-gray-800 mb-4">
              <MathJax>{question.question}</MathJax>
            </div>

            <div className="space-y-3">
              {question.options.map((option, optionIndex) => {
                const isSelected = responses[index] === optionIndex;
                const isCorrect = question.correctOptions.includes(optionIndex);
                const showCorrectAnswer = showResults && isSubmitted;

                return (
                  <div
                    key={optionIndex}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${
                      isSubmitted && !canEdit
                        ? 'cursor-not-allowed'
                        : 'hover:bg-gray-50'
                    } ${
                      isSelected
                        ? showCorrectAnswer
                          ? isCorrect
                            ? 'bg-green-100 border-green-300'
                            : 'bg-red-100 border-red-300'
                          : 'bg-blue-100 border-blue-300'
                        : showCorrectAnswer && isCorrect
                        ? 'bg-green-50 border-green-200'
                        : 'border-gray-200'
                    }`}
                    onClick={() => handleOptionSelect(index, optionIndex)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? showCorrectAnswer
                            ? isCorrect
                              ? 'border-green-500 bg-green-500'
                              : 'border-red-500 bg-red-500'
                            : 'border-blue-500 bg-blue-500'
                          : showCorrectAnswer && isCorrect
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                      }`}>
                        {(isSelected || (showCorrectAnswer && isCorrect)) && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <span className="flex-1 text-gray-800">
                        <MathJax>{option}</MathJax>
                      </span>
                      {showCorrectAnswer && isCorrect && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {showCorrectAnswer && isSelected && !isCorrect && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show explanation if results are visible and explanation exists */}
            {showResults && question.explanation && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="font-medium text-yellow-800 mb-1">Explanation:</h4>
                <div className="text-yellow-700 text-sm">
                  <MathJax>{question.explanation}</MathJax>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button or Status - matching AssignmentCreator button style */}
      <div className="mt-8 flex items-center justify-center">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || responses.includes(-1)}
            className={`px-6 py-3 rounded-md font-medium transition-colors ${
              isSubmitting || responses.includes(-1)
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Assignment'
            )}
          </button>
        ) : (
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {canEdit && !showResults && (
              <button
                onClick={() => setShowResults(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                View Results
              </button>
            )}
            {canEdit && showResults && (
              <button
                onClick={() => setShowResults(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Hide Results
              </button>
            )}
            <span className="text-green-600 font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Assignment Submitted Successfully!
            </span>
          </div>
        )}
      </div>

      {/* Instructions - matching AssignmentCreator style */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Select one answer for single-answer questions</li>
          <li>• Questions marked as "Multiple answers" may have more than one correct option</li>
          <li>• You must answer all questions before submitting</li>
          {canEdit && (
            <li>• As the assignment owner, you can view correct answers and explanations</li>
          )}
          {!canEdit && isSubmitted && (
            <li>• Your responses have been recorded and cannot be changed</li>
          )}
        </ul>
      </div>
    </div>
  );
};