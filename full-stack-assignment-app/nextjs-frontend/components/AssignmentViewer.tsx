'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, User, FileText, AlertCircle, X, GraduationCap, Users, Check } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

import { Assignment, AssignmentResponse, verifyStudentDataSecurity } from '@/types';

interface ExtendedAssignment extends Assignment {
  showCorrectAnswers?: boolean;
  isGradedForPoints?: boolean;
}

const KaTeXRenderer: React.FC<{ children: string; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && children) {
      try {
        ref.current.innerHTML = '';
        
        if (children.includes('$') || children.includes('\\')) {
          let processedContent = children;
          
          processedContent = processedContent.replace(/\$\$(.*?)\$\$/g, (match, math) => {
            try {
              return katex.renderToString(math, { displayMode: true });
            } catch (e: any) {
              return `<span style="color: red;">Math Error: ${math}</span>`;
            }
          });
          
          processedContent = processedContent.replace(/\$([^$]*?)\$/g, (match, math) => {
            try {
              return katex.renderToString(math, { displayMode: false });
            } catch (e: any) {
              return `<span style="color: red;">Math Error: ${math}</span>`;
            }
          });
          
          ref.current.innerHTML = processedContent;
        } else {
          ref.current.textContent = children;
        }
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        if (ref.current) {
          ref.current.innerHTML = `<span style="color: red;">Render Error: ${children}</span>`;
        }
      }
    }
  }, [children]);

  return <div ref={ref} className={className} />;
};

interface AssignmentViewerProps {
  assignment: ExtendedAssignment;
  studentId: string;
  assignmentOwnerId: string;
  onCloseAction: () => void;
}

export const AssignmentViewer = ({ assignment, studentId, assignmentOwnerId, onCloseAction }: AssignmentViewerProps) => {
  const [responses, setResponses] = useState<(number | number[])[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [existingResponse, setExistingResponse] = useState<AssignmentResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [visibleQuestionIndex, setVisibleQuestionIndex] = useState(0);

  const totalQuestions = Object.keys(assignment.questions).length;
  const answeredQuestions = responses.filter(r => 
    Array.isArray(r) ? r.length > 0 : (typeof r === 'number' && r !== -1)
  ).length;
  const completionPercentage = Math.round((answeredQuestions / totalQuestions) * 100);
  const questionsArray = Object.entries(assignment.questions);

  useEffect(() => {
    const verifyAssignmentSecurity = () => {
      return verifyStudentDataSecurity(assignment);
    };
    
    if (!verifyAssignmentSecurity()) {
      return;
    }
    
    const questionCount = Object.keys(assignment.questions).length;
    setResponses(new Array(questionCount).fill(-1));
    
    // console.log('🔍 Assignment settings debug:', {
    //   showCorrectAnswers: assignment.showCorrectAnswers,
    //   isGradedForPoints: assignment.isGradedForPoints,
    //   title: assignment.title
    // });
    
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
      // console.log('Permissions check:', data);
    } catch (error) {
      // console.error('Error checking permissions:', error);
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
          setShowResults(true);
          
          // console.log('🔍 Response debug:', {
          //   hasGradingDetails: !!data.response.gradingDetails,
          //   gradingDetailsLength: data.response.gradingDetails?.length || 0,
          //   showResults: true,
          //   canEdit: canEdit,
          //   response: data.response
          // });
        }
      }
    } catch (error) {
      // console.error('Error checking existing response:', error);
    }
  };

  const isQuestionMultipleChoice = (questionIndex: number): boolean => {
    const questionKey = (questionIndex + 1).toString();
    const question = assignment.questions[questionKey];
    
    if (question && 'questionType' in question) {
      return (question as any).questionType === 'multiple';
    }
    
    if (shouldShowResults()) {
      const questionResult = getQuestionResult(questionIndex);
      return (questionResult?.correctOptions || []).length > 1;
    }
    
    return false;
  };

  const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) {
      // console.log('🚫 Option selection disabled - assignment already submitted');
      return;
    }
    
    const isMultipleChoice = isQuestionMultipleChoice(questionIndex);
    const newResponses = [...responses];
    
    if (isMultipleChoice) {
      const currentSelections = Array.isArray(newResponses[questionIndex]) 
        ? [...(newResponses[questionIndex] as number[])] 
        : [];
      const selectionIndex = currentSelections.indexOf(optionIndex);
      
      if (selectionIndex > -1) {
        currentSelections.splice(selectionIndex, 1);
      } else {
        currentSelections.push(optionIndex);
      }
      
      newResponses[questionIndex] = currentSelections;
    } else {
      newResponses[questionIndex] = optionIndex;
    }
    
    setResponses(newResponses);
  };

  const handleSubmit = async () => {
    const unanswered = responses.findIndex((r, index) => {
      const isMultiple = isQuestionMultipleChoice(index);
      if (isMultiple) {
        return !Array.isArray(r) || r.length === 0;
      } else {
        return typeof r !== 'number' || r === -1;
      }
    });
    
    if (unanswered !== -1) {
      alert(`Please answer question ${unanswered + 1} before submitting.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const convertedResponses = responses.map((response, index) => {
        const isMultiple = isQuestionMultipleChoice(index);
        
        if (isMultiple) {
          return Array.isArray(response) ? response : [];
        } else {
          return typeof response === 'number' ? response : 
                 (Array.isArray(response) ? response[0] || -1 : -1);
        }
      });

      const payload = {
        userId: studentId,
        assignmentId: assignment.assignmentId,
        assignmentOwnerId: assignmentOwnerId,
        userAssignmentResponse: convertedResponses
      };

      // console.log('Submitting assignment response (secure - no correct answers included):', payload);

      const response = await fetch('/api/assignment-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        // console.log('Assignment submitted and automatically graded:', data);
        
      const gradeMessage = assignment.isGradedForPoints === false 
        ? 'Practice assignment completed successfully!\n\nGreat job practicing these concepts!'
        : data.score !== undefined && data.totalPoints !== undefined
          ? `Assignment submitted successfully!\n\nScore: ${data.score}/${data.totalPoints} points (${data.percentage}%)\nGrading: ${data.gradingSummary || 'Complete'}`
          : 'Assignment submitted successfully!';
          
        alert(gradeMessage);
        setIsSubmitted(true);
        
        await checkExistingResponse();
        setShowResults(true);
        
        // setTimeout(() => {
        //   console.log('🔍 Post-submission debug:', {
        //     isSubmitted: true,
        //     showResults: true,
        //     shouldShowResults: shouldShowResults(),
        //     shouldShowCorrectAnswers: shouldShowCorrectAnswers(),
        //     existingResponse: existingResponse
        //   });
        // }, 100);
      } else {
        const error = await response.json();
        // console.error('Submission failed:', error);
        alert(`Failed to submit assignment: ${error.error}`);
      }
    } catch (error) {
      // console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const shouldShowResults = () => {
    return showResults && isSubmitted && existingResponse && existingResponse.gradingDetails;
  };

  const shouldShowCorrectAnswers = () => {
    const result = shouldShowResults() && assignment.showCorrectAnswers !== false;
    // console.log('🔍 shouldShowCorrectAnswers check:', {
    //   shouldShowResults: shouldShowResults(),
    //   assignmentShowCorrectAnswers: assignment.showCorrectAnswers,
    //   finalResult: result,
    //   isSubmitted: isSubmitted,
    //   hasExistingResponse: !!existingResponse,
    //   hasGradingDetails: !!existingResponse?.gradingDetails
    // });
    return result;
  };

  const getQuestionResult = (questionIndex: number) => {
    if (!shouldShowResults() || !existingResponse?.gradingDetails) {
      return null;
    }
    
    return existingResponse.gradingDetails.find(detail => 
      detail.questionKey === (questionIndex + 1).toString()
    );
  };

  const getQuestionType = (question: any, questionIndex: number): string => {
    const isMultiple = isQuestionMultipleChoice(questionIndex);
    return isMultiple ? 'Multiple Choice' : 'Single Choice';
  };

  const scrollToQuestion = (index: number) => {
    const questionElement = document.getElementById(`question-${index}`);
    if (questionElement) {
      questionElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.target as HTMLDivElement;
    
    for (let i = 0; i < questionsArray.length; i++) {
      const questionElement = document.getElementById(`question-${i}`);
      if (questionElement) {
        const rect = questionElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        if (rect.top >= containerRect.top && rect.top <= containerRect.top + containerRect.height / 2) {
          if (visibleQuestionIndex !== i) {
            setVisibleQuestionIndex(i);
          }
          break;
        }
      }
    }
  };

  const getQuestionStatus = (index: number) => {
    const response = responses[index];
    if (Array.isArray(response) ? response.length > 0 : (typeof response === 'number' && response !== -1)) {
      return 'answered';
    }
    return 'unanswered';
  };

  const handleClose = () => {
    onCloseAction();
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div>
          <h1 className="text-xl font-bold text-teal-800">{assignment.title}</h1>
          <div className="text-xs text-gray-600 mt-1">
            <span>{totalQuestions} questions</span>
            {assignment.isGradedForPoints !== false && (
              <>
                <span className="mx-2">•</span>
                <span>
                  {Object.values(assignment.questions).reduce((sum, q) => sum + q.points, 0)} total points
                </span>
              </>
            )}
            {assignment.isGradedForPoints === false && (
              <>
                <span className="mx-2">•</span>
                <span className="text-blue-600 font-medium">Ungraded Practice</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {shouldShowResults() && existingResponse && assignment.isGradedForPoints !== false && (
            <div className="text-right">
              <div className="text-xl font-bold text-teal-600">
                {existingResponse.score}/{existingResponse.totalPoints}
              </div>
              <div className="text-xs text-gray-600">
                {existingResponse.percentage}% • {existingResponse.score >= existingResponse.totalPoints * 0.7 ? '✅ Passed' : '❌ Failed'}
              </div>
            </div>
          )}
          {shouldShowResults() && existingResponse && assignment.isGradedForPoints === false && (
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">✓ Completed</div>
              <div className="text-xs text-gray-600">Practice Assignment</div>
            </div>
          )}
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 bg-white border-b">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">Progress</span>
          <span className="text-xs text-gray-600">
            {answeredQuestions} of {totalQuestions} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-teal-500 to-teal-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <div className="text-xs text-teal-600 font-medium mt-1">
          {completionPercentage}% Complete
        </div>
      </div>

      {/* Assignment Status */}
      <div className="px-4 py-2 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubmitted ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-800 font-medium text-sm">
                  Submitted on {existingResponse ? new Date(existingResponse.submittedAt).toLocaleString() : 'Unknown'}
                </span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800 font-medium text-sm">In Progress</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-gray-500" />
            <span className="text-xs text-gray-600">Student: {studentId}</span>
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

        {/* Main Questions Area */}
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
                          {assignment.isGradedForPoints !== false && (
                            <span className="ml-3 text-lg text-gray-500 font-normal">
                              ({question.points} point{question.points !== 1 ? 's' : ''})
                            </span>
                          )}
                          {assignment.isGradedForPoints === false && (
                            <span className="ml-3 text-sm text-blue-600 font-normal bg-blue-100 px-2 py-1 rounded">
                              Practice Question
                            </span>
                          )}
                        </h2>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            assignment.isGradedForPoints === false
                              ? 'bg-blue-100 text-blue-800'
                              : question.points > 1
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {getQuestionType(question, index)}
                          </span>
                          
                          {shouldShowResults() && questionResult && assignment.isGradedForPoints !== false && (
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
                          
                          {shouldShowResults() && questionResult && assignment.isGradedForPoints === false && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              questionResult.isCorrect 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {questionResult.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="text-lg text-gray-800 mb-6 leading-relaxed">
                      <KaTeXRenderer>{question.question}</KaTeXRenderer>
                    </div>

                    {/* Multiple Choice Instructions */}
                    {(() => {
                      const isMultipleChoice = isQuestionMultipleChoice(index);
                      
                      if (isMultipleChoice) {
                        return (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm font-medium text-blue-800">
                              📋 Multiple Correct Answers
                            </div>
                            <div className="text-sm text-blue-700 mt-1">
                              This question has multiple correct answers. Select all that apply to receive full credit.
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Options */}
                    <div className="space-y-3">
                      {question.options.map((option, optionIndex) => {
                        const isMultipleChoice = isQuestionMultipleChoice(index);
                        const questionResult = getQuestionResult(index);
                        const correctOptions = questionResult?.correctOptions || [];
                        
                        const currentResponse = responses[index];
                        const isSelected = isMultipleChoice ? 
                          (Array.isArray(currentResponse) ? currentResponse.includes(optionIndex) : false) :
                          (typeof currentResponse === 'number' ? currentResponse === optionIndex : 
                           Array.isArray(currentResponse) ? currentResponse.includes(optionIndex) : false);
                        const isCorrectOption = correctOptions.includes(optionIndex);
                        const showCorrectAnswer = shouldShowCorrectAnswers();

                        return (
                          <div
                            key={optionIndex}
                            className={`group relative p-4 border-2 rounded-xl transition-all duration-200 ${
                              isSubmitted 
                                ? 'cursor-not-allowed opacity-90' 
                                : 'cursor-pointer transform hover:scale-[1.01] hover:shadow-md active:scale-[0.99]'
                            } ${
                              isSelected
                                ? showCorrectAnswer
                                  ? isCorrectOption
                                    ? 'bg-green-100 border-green-400 shadow-green-100'
                                    : 'bg-red-100 border-red-400 shadow-red-100'
                                  : shouldShowResults()
                                  ? questionResult?.isCorrect
                                    ? 'bg-green-100 border-green-400 shadow-green-100'
                                    : 'bg-red-100 border-red-400 shadow-red-100'
                                  : 'bg-teal-100 border-teal-400 shadow-teal-100'
                                : showCorrectAnswer && isCorrectOption
                                ? 'bg-green-50 border-green-300'
                                : isSubmitted
                                ? 'border-gray-200 bg-gray-50'
                                : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50'
                            }`}
                            onClick={() => handleOptionSelect(index, optionIndex)}
                          >
                            <div className="flex items-center gap-4">
                              {isMultipleChoice ? (
                                <div className={`relative w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all duration-200 ${
                                  isSelected
                                    ? showCorrectAnswer
                                      ? isCorrectOption
                                        ? 'border-green-500 bg-green-500'
                                        : 'border-red-500 bg-red-500'
                                      : shouldShowResults()
                                      ? questionResult?.isCorrect
                                        ? 'border-green-500 bg-green-500'
                                        : 'border-red-500 bg-red-500'
                                      : 'border-teal-500 bg-teal-500'
                                    : showCorrectAnswer && isCorrectOption
                                    ? 'border-green-500 bg-green-500'
                                    : 'border-gray-300 group-hover:border-teal-400'
                                }`}>
                                  {(isSelected || (showCorrectAnswer && isCorrectOption)) && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              ) : (
                                <div className={`relative w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                  isSelected
                                    ? showCorrectAnswer
                                      ? isCorrectOption
                                        ? 'border-green-500 bg-green-500'
                                        : 'border-red-500 bg-red-500'
                                      : shouldShowResults()
                                      ? questionResult?.isCorrect
                                        ? 'border-green-500 bg-green-500'
                                        : 'border-red-500 bg-red-500'
                                      : 'border-teal-500 bg-teal-500'
                                    : showCorrectAnswer && isCorrectOption
                                    ? 'border-green-500 bg-green-500'
                                    : 'border-gray-300 group-hover:border-teal-400'
                                }`}>
                                  {(isSelected || (showCorrectAnswer && isCorrectOption)) && (
                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                  )}
                                </div>
                              )}

                              <div className="flex-1 text-gray-800 font-medium">
                                <KaTeXRenderer>{option}</KaTeXRenderer>
                              </div>

                              {showCorrectAnswer && isCorrectOption && !isSelected && (
                                <span className="text-green-600 text-sm font-semibold px-2 py-1 bg-green-100 rounded-lg">
                                  ✓ Correct Answer
                                </span>
                              )}
                              {!showCorrectAnswer && shouldShowResults() && isSelected && (
                                <span className={`text-sm font-semibold px-2 py-1 rounded-lg ${
                                  questionResult?.isCorrect 
                                    ? 'text-green-600 bg-green-100' 
                                    : 'text-red-600 bg-red-100'
                                }`}>
                                  {questionResult?.isCorrect ? '✓ Correct' : '✗ Incorrect'}
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
                    {shouldShowCorrectAnswers() && question.explanation && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Explanation:
                        </div>
                        <div className="text-blue-700">
                          <KaTeXRenderer>{question.explanation}</KaTeXRenderer>
                        </div>
                      </div>
                    )}
                    
                    {!shouldShowCorrectAnswers() && shouldShowResults() && questionResult && (
                      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Result:
                        </div>
                        <div className={`font-medium ${questionResult.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {questionResult.isCorrect ? (
                            assignment.isGradedForPoints !== false 
                              ? `✓ Correct! You earned ${questionResult.pointsEarned} point${questionResult.pointsEarned !== 1 ? 's' : ''}.`
                              : '✓ Correct! Well done on this practice question.'
                          ) : (
                            assignment.isGradedForPoints !== false
                              ? '✗ Incorrect. Review the material and try again on future assignments.'
                              : '✗ Incorrect. This is practice - review the material and keep learning!'
                          )}
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
            <div className="p-4 border-t bg-white shadow-lg">
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-center items-center">
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-600">
                      <span className={`font-medium ${answeredQuestions === totalQuestions ? 'text-green-600' : 'text-orange-600'}`}>
                        {answeredQuestions} of {totalQuestions} {assignment.isGradedForPoints === false ? 'completed' : 'answered'}
                      </span>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || responses.some((r, index) => {
                        const isMultiple = isQuestionMultipleChoice(index);
                        return isMultiple ? (!Array.isArray(r) || r.length === 0) : (typeof r !== 'number' || r === -1);
                      })}
                      className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                        isSubmitting || responses.some((r, index) => {
                          const isMultiple = isQuestionMultipleChoice(index);
                          return isMultiple ? (!Array.isArray(r) || r.length === 0) : (typeof r !== 'number' || r === -1);
                        })
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-teal-600 text-white hover:bg-teal-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isSubmitting ? 'Submitting...' : 
                       assignment.isGradedForPoints === false ? 'Complete Practice' : 'Submit Assignment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};