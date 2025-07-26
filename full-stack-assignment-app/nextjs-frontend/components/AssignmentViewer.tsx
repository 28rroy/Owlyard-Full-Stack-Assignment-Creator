'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, FileText, AlertCircle, X, GraduationCap, Users, Check } from 'lucide-react';
import { MathJax } from '@/components/MathJax';

import { Assignment, AssignmentResponse, verifyStudentDataSecurity } from '@/types';

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
  const [visibleQuestionIndex, setVisibleQuestionIndex] = useState(0);

  const totalQuestions = Object.keys(assignment.questions).length;
  const answeredQuestions = responses.filter(r => r !== -1).length;
  const completionPercentage = Math.round((answeredQuestions / totalQuestions) * 100);
  const questionsArray = Object.entries(assignment.questions);

  useEffect(() => {
    // Security verification on component mount
    const verifyAssignmentSecurity = () => {
      return verifyStudentDataSecurity(assignment);
    };
    
    if (!verifyAssignmentSecurity()) {
      return;
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
    if (isSubmitted && !canEdit) return;
    
    const newResponses = [...responses];
    newResponses[questionIndex] = optionIndex;
    setResponses(newResponses);
  };

  const handleSubmit = async () => {
    const unanswered = responses.findIndex(r => r === -1);
    if (unanswered !== -1) {
      alert(`Please answer question ${unanswered + 1} before submitting.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        userId: studentId,
        assignmentId: assignment.assignmentId,
        assignmentOwnerId: assignmentOwnerId,
        userAssignmentResponse: responses
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
        
        const gradeMessage = data.score !== undefined && data.totalPoints !== undefined
          ? `Assignment submitted successfully!\n\nScore: ${data.score}/${data.totalPoints} points (${data.percentage}%)\nGrading: ${data.gradingSummary || 'Complete'}`
          : 'Assignment submitted successfully!';
          
        alert(gradeMessage);
        setIsSubmitted(true);
        
        await checkExistingResponse();
        
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

  const shouldShowResults = () => {
    return showResults && isSubmitted && existingResponse && existingResponse.gradingDetails;
  };

  const getQuestionResult = (questionIndex: number) => {
    if (!shouldShowResults() || !existingResponse?.gradingDetails) {
      return null;
    }
    
    return existingResponse.gradingDetails.find(detail => 
      detail.questionKey === (questionIndex + 1).toString()
    );
  };

  const getQuestionType = (question: any): string => {
    return 'Single Choice';
  };

  // Scroll to specific question
  const scrollToQuestion = (index: number) => {
    const questionElement = document.getElementById(`question-${index}`);
    if (questionElement) {
      questionElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Handle scroll to update visible question
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.target as HTMLDivElement;
    
    for (let i = 0; i < questionsArray.length; i++) {
      const questionElement = document.getElementById(`question-${i}`);
      if (questionElement) {
        const rect = questionElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Check if question is in the visible area (top half of container)
        if (rect.top >= containerRect.top && rect.top <= containerRect.top + containerRect.height / 2) {
          if (visibleQuestionIndex !== i) {
            setVisibleQuestionIndex(i);
          }
          break;
        }
      }
    }
  };

  // Get question status for navigation
  const getQuestionStatus = (index: number) => {
    if (responses[index] !== -1) return 'answered';
    return 'unanswered';
  };

  const handleClose = () => {
    onCloseAction();
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div>
          <h1 className="text-2xl font-bold text-teal-800">{assignment.title}</h1>
          <div className="text-sm text-gray-600 mt-1">
            <span>{totalQuestions} questions</span>
            <span className="mx-2">•</span>
            <span>
              {Object.values(assignment.questions).reduce((sum, q) => sum + q.points, 0)} total points
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
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

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-600">
            {answeredQuestions} of {totalQuestions} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <div className="text-xs text-teal-600 font-medium mt-1">
          {completionPercentage}% Complete
        </div>
      </div>

      {/* Assignment Status */}
      <div className="px-6 py-3 bg-gray-50 border-b">
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

      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigator Sidebar */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800">Questions</h3>
          </div>
          <div className="p-2">
            {questionsArray.map(([key, question], index) => {
              const status = getQuestionStatus(index);
              const isVisible = index === visibleQuestionIndex;
              const questionResult = getQuestionResult(index);
              
              return (
                <button
                  key={key}
                  onClick={() => scrollToQuestion(index)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-all duration-200 ${
                    isVisible 
                      ? 'bg-teal-100 border-2 border-teal-400 shadow-sm' 
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        shouldShowResults() && questionResult 
                          ? questionResult.isCorrect 
                            ? 'bg-green-500 text-white' 
                            : 'bg-red-500 text-white'
                          : status === 'answered'
                          ? 'bg-teal-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}>
                        {shouldShowResults() && questionResult 
                          ? questionResult.isCorrect ? '✓' : '✗'
                          : status === 'answered' ? '✓' : index + 1
                        }
                      </div>
                      <span className={`text-sm font-medium ${isVisible ? 'text-teal-800' : 'text-gray-700'}`}>
                        Q{index + 1}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{question.points}pt</span>
                  </div>
                  <div className={`text-xs mt-1 ${
                    shouldShowResults() && questionResult 
                      ? questionResult.isCorrect ? 'text-green-600' : 'text-red-600'
                      : status === 'answered' ? 'text-teal-600' : 'text-gray-500'
                  }`}>
                    {shouldShowResults() && questionResult 
                      ? questionResult.isCorrect ? 'Correct' : 'Incorrect'
                      : status === 'answered' ? 'Answered' : 'Not answered'
                    }
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Questions Area - Scrollable */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div 
            className="flex-1 overflow-y-auto scroll-smooth"
            onScroll={handleScroll}
          >
            <div className="max-w-4xl mx-auto p-6 space-y-8">
              {questionsArray.map(([key, question], index) => {
                const questionResult = getQuestionResult(index);
                
                return (
                  <div 
                    key={key}
                    id={`question-${index}`}
                    className={`p-6 border rounded-xl bg-white shadow-sm transition-all duration-300 ${
                      shouldShowResults() ? 
                        (questionResult?.isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50') 
                        : 'border-gray-200 hover:shadow-md'
                    } ${index === visibleQuestionIndex ? 'ring-2 ring-teal-200' : ''}`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                          Question {index + 1}
                          <span className="ml-3 text-lg text-gray-500 font-normal">
                            ({question.points} point{question.points !== 1 ? 's' : ''})
                          </span>
                        </h2>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            question.points > 1
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {getQuestionType(question)}
                          </span>
                          {shouldShowResults() && questionResult && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              questionResult.isCorrect 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {questionResult.isCorrect 
                                ? `✓ Correct (+${questionResult.pointsEarned})` 
                                : '✗ Incorrect (0)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="text-lg text-gray-800 mb-6 leading-relaxed">
                      <MathJax>{question.question}</MathJax>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                      {question.options.map((option, optionIndex) => {
                        const isSelected = responses[index] === optionIndex;
                        const isCorrectOption = questionResult?.correctOptions?.includes(optionIndex);
                        const showCorrectAnswer = shouldShowResults();

                        return (
                          <div
                            key={optionIndex}
                            className={`group relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 transform ${
                              isSubmitted && !canEdit
                                ? 'cursor-not-allowed'
                                : 'hover:scale-[1.01] hover:shadow-md active:scale-[0.99]'
                            } ${
                              isSelected
                                ? showCorrectAnswer
                                  ? isCorrectOption
                                    ? 'bg-green-100 border-green-400 shadow-green-100'
                                    : 'bg-red-100 border-red-400 shadow-red-100'
                                  : 'bg-teal-100 border-teal-400 shadow-teal-100'
                                : showCorrectAnswer && isCorrectOption
                                ? 'bg-green-50 border-green-300'
                                : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50'
                            }`}
                            onClick={() => handleOptionSelect(index, optionIndex)}
                          >
                            <div className="flex items-center gap-4">
                              {/* Radio Button */}
                              <div className={`relative w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                isSelected
                                  ? showCorrectAnswer
                                    ? isCorrectOption
                                      ? 'border-green-500 bg-green-500'
                                      : 'border-red-500 bg-red-500'
                                    : 'border-teal-500 bg-teal-500'
                                  : showCorrectAnswer && isCorrectOption
                                  ? 'border-green-500 bg-green-500'
                                  : 'border-gray-300 group-hover:border-teal-400'
                              }`}>
                                {(isSelected || (showCorrectAnswer && isCorrectOption)) && (
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                )}
                              </div>

                              {/* Option Text */}
                              <div className="flex-1 text-gray-800 font-medium">
                                <MathJax>{option}</MathJax>
                              </div>

                              {/* Status Indicators */}
                              {showCorrectAnswer && isCorrectOption && !isSelected && (
                                <span className="text-green-600 text-sm font-semibold px-2 py-1 bg-green-100 rounded-lg">
                                  ✓ Correct Answer
                                </span>
                              )}
                              {isSelected && !isSubmitted && (
                                <span className="text-teal-600 text-sm font-semibold">
                                  Selected
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {shouldShowResults() && question.explanation && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Explanation:
                        </div>
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

          {/* Fixed Submit Button at Bottom */}
          {!isSubmitted && (
            <div className="p-6 border-t bg-white shadow-lg">
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-center items-center">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      <span className={`font-medium ${answeredQuestions === totalQuestions ? 'text-green-600' : 'text-orange-600'}`}>
                        {answeredQuestions} of {totalQuestions} answered
                      </span>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || responses.some(r => r === -1)}
                      className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                        isSubmitting || responses.some(r => r === -1)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-teal-600 text-white hover:bg-teal-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {shouldShowResults() && existingResponse && (
        <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Assignment Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="text-3xl font-bold text-teal-600 mb-1">{existingResponse.score}</div>
                <div className="text-sm text-gray-600">Points Earned</div>
              </div>
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="text-3xl font-bold text-blue-600 mb-1">{existingResponse.percentage}%</div>
                <div className="text-sm text-gray-600">Percentage</div>
              </div>
              <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className={`text-3xl font-bold mb-1 ${existingResponse.percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
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