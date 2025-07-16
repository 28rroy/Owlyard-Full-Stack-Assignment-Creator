'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, FileText, AlertCircle } from 'lucide-react';

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

interface AssignmentResponse {
  responseId: string;
  studentId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  responses: number[]; // Vector of chosen options
  submittedAt: string;
  status: string;
}

interface AssignmentViewerProps {
  assignment: Assignment;
  studentId: string;
  assignmentOwnerId: string;
  onClose: () => void;
}

export const AssignmentViewer = ({ assignment, studentId, assignmentOwnerId, onClose }: AssignmentViewerProps) => {
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
        `/api/assignment-responses?action=check-permissions&studentId=${studentId}&assignmentOwnerId=${assignmentOwnerId}`
      );
      const data = await response.json();
      setCanEdit(data.canEdit);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const checkExistingResponse = async () => {
    try {
      const response = await fetch(
        `/api/assignment-responses?studentId=${studentId}&assignmentId=${assignment.assignmentId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.response) {
          setExistingResponse(data.response);
          setResponses(data.response.responses);
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
      const payload = {
        studentId,
        assignmentId: assignment.assignmentId,
        assignmentOwnerId,
        responses
      };

      const response = await fetch('/api/assignment-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Assignment submitted successfully!');
        setIsSubmitted(true);
        
        // If student is owner, show results immediately
        if (canEdit) {
          setShowResults(true);
        }
      } else {
        const error = await response.json();
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

  const getTotalPoints = (): number => {
    return Object.values(assignment.questions).reduce((total, q) => total + q.points, 0);
  };

  const getScore = (): number => {
    if (!showResults) return 0;
    
    let score = 0;
    Object.entries(assignment.questions).forEach(([key, question], index) => {
      const studentAnswer = responses[index];
      if (question.correctOptions.includes(studentAnswer)) {
        score += question.points;
      }
    });
    return score;
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-teal-800">{assignment.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {Object.keys(assignment.questions).length} questions
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {getTotalPoints()} total points
              </span>
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Student: {studentId}
              </span>
              {canEdit && (
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                  Owner View
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Status and Score */}
        {isSubmitted && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  Assignment Submitted
                </span>
              </div>
              {showResults && (
                <div className="text-green-800 font-bold">
                  Score: {getScore()}/{getTotalPoints()} points
                </div>
              )}
            </div>
            {existingResponse && (
              <p className="text-green-700 text-sm mt-1">
                Submitted on {new Date(existingResponse.submittedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {Object.entries(assignment.questions).map(([questionKey, question], questionIndex) => (
          <div key={questionKey} className="border border-gray-200 rounded-lg p-6">
            {/* Question Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Question {questionIndex + 1}
                </h3>
                <p className="text-gray-800 mb-3">{question.question}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-blue-600">
                    <AlertCircle className="h-4 w-4" />
                    {getQuestionType(question)}
                  </span>
                  <span className="text-gray-600">
                    {question.points} {question.points === 1 ? 'point' : 'points'}
                  </span>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option, optionIndex) => {
                const isSelected = responses[questionIndex] === optionIndex;
                const isCorrect = question.correctOptions.includes(optionIndex);
                const showCorrectAnswer = showResults && isCorrect;
                const showWrongAnswer = showResults && isSelected && !isCorrect;
                
                return (
                  <div
                    key={optionIndex}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? showWrongAnswer
                          ? 'border-red-500 bg-red-50'
                          : showCorrectAnswer
                          ? 'border-green-500 bg-green-50'
                          : 'border-teal-500 bg-teal-50'
                        : showCorrectAnswer
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-25'
                    } ${
                      (isSubmitted && !canEdit) ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    onClick={() => handleOptionSelect(questionIndex, optionIndex)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? showWrongAnswer
                              ? 'border-red-500 bg-red-500'
                              : showCorrectAnswer
                              ? 'border-green-500 bg-green-500'
                              : 'border-teal-500 bg-teal-500'
                            : showCorrectAnswer
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-400'
                        }`}
                      >
                        {(isSelected || showCorrectAnswer) && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className={`flex-1 ${
                        showCorrectAnswer ? 'text-green-800 font-medium' : 
                        showWrongAnswer ? 'text-red-800' : 'text-gray-800'
                      }`}>
                        {option}
                      </span>
                      {showResults && (
                        <div className="flex items-center gap-1">
                          {isCorrect && (
                            <span className="text-green-600 text-sm font-medium">Correct</span>
                          )}
                          {showWrongAnswer && (
                            <span className="text-red-600 text-sm font-medium">Your Choice</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation (only show if results are visible and explanation exists) */}
            {showResults && question.explanation && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
                <p className="text-blue-800 text-sm">{question.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="mt-8 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {responses.filter(r => r !== -1).length} of {responses.length} questions answered
        </div>
        
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || responses.includes(-1)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
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
          <div className="flex items-center gap-4">
            {canEdit && !showResults && (
              <button
                onClick={() => setShowResults(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Results
              </button>
            )}
            {canEdit && showResults && (
              <button
                onClick={() => setShowResults(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Hide Results
              </button>
            )}
            <span className="text-green-600 font-medium">Assignment Submitted Successfully!</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
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