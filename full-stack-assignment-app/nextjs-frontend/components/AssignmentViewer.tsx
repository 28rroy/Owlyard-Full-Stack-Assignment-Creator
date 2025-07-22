'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, FileText, AlertCircle, X, GraduationCap, Users } from 'lucide-react';
import { MathJax } from '@/components/MathJax';

import { Assignment, AssignmentResponse, verifyStudentDataSecurity } from '@/types';

// ⭐ Remove conflicting type definitions - use the ones from @/types instead

interface AssignmentViewerProps {
  assignment: Assignment; // Use the compatible Assignment type
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
    // ⭐ NEW: Security verification on component mount
    const verifyAssignmentSecurity = () => {
      return verifyStudentDataSecurity(assignment);
    };
    
    if (!verifyAssignmentSecurity()) {
      return; // Exit if security check fails
    }
    
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
      const response = await fetch(
        `/api/assignment-responses?userId=${studentId}&assignmentId=${assignment.assignmentId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.response) {
          setExistingResponse(data.response);
          setResponses(data.response.userAssignmentResponse);
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

  // ⭐ UPDATED: Enhanced submit with automatic grading
  const handleSubmit = async () => {
    // Check if all questions are answered
    const unanswered = responses.findIndex(r => r === -1);
    if (unanswered !== -1) {
      alert(`Please answer question ${unanswered + 1} before submitting.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // ⭐ UPDATED: Use secure payload (no correct answers sent from frontend)
      const payload = {
        userId: studentId,
        assignmentId: assignment.assignmentId,
        assignmentOwnerId: assignmentOwnerId,
        userAssignmentResponse: responses // Student's selected options only
        // ⭐ Note: No correct answers sent - grading happens securely on backend
      };

      console.log('Submitting assignment response (secure - no correct answers included):', payload);

      const response = await fetch('/api/assignment-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Assignment submitted and automatically graded:', data);
        
        // ⭐ NEW: Show detailed grading results
        const gradeMessage = data.score !== undefined && data.totalPoints !== undefined
          ? `Assignment submitted successfully!\n\nScore: ${data.score}/${data.totalPoints} points (${data.percentage}%)\nGrading: ${data.gradingSummary || 'Complete'}`
          : 'Assignment submitted successfully!';
          
        alert(gradeMessage);
        setIsSubmitted(true);
        
        // Refresh to get the graded response
        await checkExistingResponse();
        
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

  // ⭐ NEW: Function to check if results should be shown
  const shouldShowResults = () => {
    return showResults && isSubmitted && existingResponse && existingResponse.gradingDetails;
  };

  // ⭐ NEW: Function to get question result for display
  const getQuestionResult = (questionIndex: number) => {
    if (!shouldShowResults() || !existingResponse?.gradingDetails) {
      return null;
    }
    
    return existingResponse.gradingDetails.find(detail => 
      detail.questionKey === (questionIndex + 1).toString()
    );
  };

  const getQuestionType = (question: any): string => {
    // Since students don't get correctOptions populated, we can't determine this accurately
    // This is acceptable since it's just for display
    return 'Single Choice'; // Default assumption for student view
  };

  const handleClose = () => {
    onCloseAction();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold text-teal-800">{assignment.title}</h1>
          <div className="text-sm text-gray-600 mt-1">
            <span>{Object.keys(assignment.questions).length} questions</span>
            <span className="mx-2">•</span>
            <span>
              {Object.values(assignment.questions).reduce((sum, q) => sum + q.points, 0)} total points
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* ⭐ NEW: Show score if results available */}
          {shouldShowResults() && existingResponse && (
            <div className="text-right">
              <div className="text-2xl font-bold text-teal-600">
                {existingResponse.score}/{existingResponse.totalPoints}
              </div>
              <div className="text-sm text-gray-600">
                {existingResponse.percentage}% • {existingResponse.score >= existingResponse.totalPoints * 0.7 ? '✅ Passed' : '❌ Failed'}
              </div>
            </div>
          )}
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Assignment Status */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubmitted ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">
                  Submitted on {existingResponse ? new Date(existingResponse.submittedAt).toLocaleString() : 'Unknown'}
                </span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-medium">In Progress</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Student: {studentId}</span>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-6">
          {Object.entries(assignment.questions).map(([key, question], index) => {
            const questionResult = getQuestionResult(index);
            const isCorrect = questionResult?.isCorrect;
            const correctOptions = questionResult?.correctOptions || [];
            
            return (
              <div 
                key={key} 
                className={`p-4 border rounded-md bg-white shadow-sm ${
                  shouldShowResults() ? (isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50') : 'bg-gray-50'
                }`}
              >
                {/* Question header with results indicator */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-teal-800">
                    Question {index + 1}
                    <span className="ml-2 text-sm text-gray-500 font-normal">
                      ({question.points} point{question.points !== 1 ? 's' : ''})
                    </span>
                  </h3>
                  {shouldShowResults() && questionResult && (
                    <div className={`px-3 py-1 rounded text-sm font-medium ${
                      isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isCorrect ? `✓ Correct (+${questionResult.pointsEarned})` : '✗ Incorrect (0)'}
                    </div>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    question.points > 1
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
                    const isCorrectOption = correctOptions.includes(optionIndex);
                    const showCorrectAnswer = shouldShowResults();

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
                              ? isCorrectOption
                                ? 'bg-green-100 border-green-300'
                                : 'bg-red-100 border-red-300'
                              : 'bg-blue-100 border-blue-300'
                            : showCorrectAnswer && isCorrectOption
                            ? 'bg-green-50 border-green-200'
                            : 'border-gray-200'
                        }`}
                        onClick={() => handleOptionSelect(index, optionIndex)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? showCorrectAnswer
                                ? isCorrectOption
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-red-500 bg-red-500'
                                : 'border-blue-500 bg-blue-500'
                              : showCorrectAnswer && isCorrectOption
                              ? 'border-green-500 bg-green-500'
                              : 'border-gray-300'
                          }`}>
                            {(isSelected || (showCorrectAnswer && isCorrectOption)) && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 text-gray-800">
                            <MathJax>{option}</MathJax>
                          </div>
                          {showCorrectAnswer && isCorrectOption && !isSelected && (
                            <span className="text-green-600 text-sm font-medium">Correct Answer</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Show explanation after submission if available */}
                {shouldShowResults() && question.explanation && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-sm font-medium text-blue-800 mb-2">Explanation:</div>
                    <div className="text-blue-700">
                      <MathJax>{question.explanation}</MathJax>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      {!isSubmitted && (
        <div className="p-6 border-t bg-white">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {responses.filter(r => r !== -1).length} of {Object.keys(assignment.questions).length} questions answered
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || responses.some(r => r === -1)}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                isSubmitting || responses.some(r => r === -1)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {shouldShowResults() && existingResponse && (
        <div className="p-6 border-t bg-gray-50">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Assignment Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-teal-600">{existingResponse.score}</div>
                <div className="text-sm text-gray-600">Points Earned</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">{existingResponse.percentage}%</div>
                <div className="text-sm text-gray-600">Percentage</div>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <div className={`text-2xl font-bold ${existingResponse.percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                  {existingResponse.percentage >= 90 ? 'A' : 
                   existingResponse.percentage >= 80 ? 'B' : 
                   existingResponse.percentage >= 70 ? 'C' : 
                   existingResponse.percentage >= 60 ? 'D' : 'F'}
                </div>
                <div className="text-sm text-gray-600">Grade</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};