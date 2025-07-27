"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, Pencil, Eye, X, FileText, Send } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { KaTeXHelp } from "@/components/KaTeXHelp";

// KaTeX Renderer Component (React 19 compatible replacement for MathJax)
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
          
          // Replace display math ($$...$$)
          processedContent = processedContent.replace(/\$\$(.*?)\$\$/g, (match, math) => {
            try {
              return katex.renderToString(math, { displayMode: true });
            } catch (e: any) {
              return `<span style="color: red;">Math Error: ${math}</span>`;
            }
          });
          
          // Replace inline math ($...$)
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

type QuestionData = {
  question: string;
  questionEditable: boolean;
  options: string[];
  optionsEditable: boolean;
  correctCount: number;
  correctAnswers: number[];
  explanation: string;
  showExplanation: boolean;
  showQuestionPreview: boolean;
  showOptionPreviews: boolean[];
  showExplanationPreview: boolean;
  points: number;
};

// JSON structure for API
interface AssignmentQuestion {
  question: string;
  options: string[];
  correctOptions: number[];
  explanation: string;
  points: number;
  // Legacy support - might exist in older data
  correctAnswers?: number[];
}

interface AssignmentData {
  [key: string]: AssignmentQuestion;
}

const defaultQuestion = (): QuestionData => ({
  question: "",
  questionEditable: true,
  options: [],
  optionsEditable: true,
  correctCount: 0,
  correctAnswers: [],
  explanation: "",
  showExplanation: false,
  showQuestionPreview: false,
  showOptionPreviews: [],
  showExplanationPreview: false,
  points: 1,
});

// Types for editing
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

interface AssignmentCreatorProps {
  editingAssignment?: Assignment | null;
}

export const AssignmentCreator = ({ editingAssignment }: AssignmentCreatorProps) => {
  const { userId, assignmentOwnerId } = useUser();
  const [questions, setQuestions] = useState<QuestionData[]>([defaultQuestion()]);
  const [numOptions, setNumOptions] = useState<number[]>([0]);
  const [assignmentTitle, setAssignmentTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isGradedForPoints, setIsGradedForPoints] = useState<boolean>(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState<boolean>(true);

  // Load assignment data when editing
  useEffect(() => {
    if (editingAssignment) {
      console.log('🔍 Loading assignment for editing:', editingAssignment);
      setIsEditing(true);
      setAssignmentTitle(editingAssignment.title);
      
      // Load assignment settings
      setIsGradedForPoints((editingAssignment as any).isGradedForPoints ?? true);
      setShowCorrectAnswers((editingAssignment as any).showCorrectAnswers ?? true);
      
      // Convert API format back to form format
      const formQuestions: QuestionData[] = [];
      const optionCounts: number[] = [];
      
      Object.entries(editingAssignment.questions).forEach(([key, question]) => {
        console.log(`🔍 Processing question ${key}:`, question);
        
        // 🔍 FIX: Get correct answers from the assignment-level correctAnswers field
        const assignmentCorrectAnswers = (editingAssignment as any).correctAnswers;
        const correctOptions = assignmentCorrectAnswers && assignmentCorrectAnswers[key] 
          ? assignmentCorrectAnswers[key].correctOptions || []
          : [];
        
        console.log(`🔍 Correct options for question ${key}:`, correctOptions);
        
        const formQuestion: QuestionData = {
          question: question.question || "",
          questionEditable: false,
          options: question.options || [],
          optionsEditable: false,
          correctCount: Array.isArray(correctOptions) ? correctOptions.length : 0,
          correctAnswers: Array.isArray(correctOptions) ? correctOptions : [],
          explanation: question.explanation || "",
          showExplanation: !!question.explanation,
          showQuestionPreview: false,
          showOptionPreviews: new Array(question.options?.length || 0).fill(false),
          showExplanationPreview: false,
          points: question.points || 1,
        };
        
        console.log(`🔍 Form question ${key} created:`, {
          correctAnswers: formQuestion.correctAnswers,
          correctCount: formQuestion.correctCount,
          options: formQuestion.options.length
        });
        
        formQuestions.push(formQuestion);
        optionCounts.push(question.options?.length || 0);
      });
      
      console.log('🔍 Final form questions:', formQuestions);
      setQuestions(formQuestions);
      setNumOptions(optionCounts);
    }
  }, [editingAssignment]);

  // Validation constants
  const MAX_QUESTION_LENGTH = 1000;
  const MAX_OPTION_LENGTH = 500;
  const MAX_QUESTIONS = 100;

  const updateQuestion = (index: number, changes: Partial<QuestionData>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...changes };
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, i: number, value: string) => {
    const updatedOptions = [...questions[qIndex].options];
    updatedOptions[i] = value;
    updateQuestion(qIndex, { options: updatedOptions });
  };

  const handleNumOptionsChange = (qIndex: number, count: number) => {
    updateQuestion(qIndex, {
      options: Array(count).fill(""),
      correctAnswers: [],
      correctCount: 0,
      optionsEditable: true,
    });

    const updatedCounts = [...numOptions];
    updatedCounts[qIndex] = count;
    setNumOptions(updatedCounts);
  };

  const handleNextQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) {
      alert(`Maximum ${MAX_QUESTIONS} questions allowed.`);
      return;
    }
    setQuestions((prev) => [...prev, defaultQuestion()]);
    setNumOptions((prev) => [...prev, 0]);
  };

  const handleCorrectAnswerToggle = (qIndex: number, optionIndex: number) => {
    const currentCorrect = questions[qIndex].correctAnswers;
    const isCurrentlyCorrect = currentCorrect.includes(optionIndex);
    
    let newCorrectAnswers;
    if (isCurrentlyCorrect) {
      // Remove from correct answers
      newCorrectAnswers = currentCorrect.filter(idx => idx !== optionIndex);
    } else {
      // Add to correct answers
      newCorrectAnswers = [...currentCorrect, optionIndex];
    }
    
    updateQuestion(qIndex, { 
      correctAnswers: newCorrectAnswers,
      correctCount: newCorrectAnswers.length
    });
  };

  // Convert form data to JSON format
  const convertToAssignmentJSON = (questions: QuestionData[]): AssignmentData => {
    const assignmentData: AssignmentData = {};
    
    questions.forEach((question, index) => {
      // Only include questions that have content
      if (question.question.trim() && question.options.length > 0) {
        const questionKey = (index + 1).toString();
        
        assignmentData[questionKey] = {
          question: question.question.trim(),
          options: question.options.filter(opt => opt.trim() !== ''),
          correctOptions: question.correctAnswers.filter(answer => answer !== -1),
          explanation: question.explanation.trim(),
          points: question.points
        };
      }
    });
    
    return assignmentData;
  };

  // Enhanced validation function
  const isAssignmentValid = (): boolean => {
    if (!assignmentTitle.trim()) return false;
    
    return questions.some(q => {
      return q.question.trim() !== '' && 
             q.question.length <= MAX_QUESTION_LENGTH &&
             q.options.length > 0 && 
             q.options.some(opt => opt.trim() !== '' && opt.length <= MAX_OPTION_LENGTH) &&
             q.correctAnswers.some(answer => answer !== -1);
    });
  };

  // Save assignment to API
  const saveAssignmentToAPI = async (assignmentData: AssignmentData) => {
    try {
      const payload = {
        title: assignmentTitle.trim(),
        questions: assignmentData,
        createdAt: new Date().toISOString(),
        metadata: {
          totalQuestions: Object.keys(assignmentData).length
        },
        userId: userId,
        assignmentOwnerId: assignmentOwnerId,
        isGradedForPoints: isGradedForPoints,
        showCorrectAnswers: showCorrectAnswers
      };

      // Add assignment ID if editing
      if (isEditing && editingAssignment) {
        (payload as any).assignmentId = editingAssignment.assignmentId;
      }

      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save assignment: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  };

  // Handle save assignment with validation
  const handleSaveAssignment = async () => {
    // Check question limits
    if (questions.length > MAX_QUESTIONS) {
      alert(`Maximum ${MAX_QUESTIONS} questions allowed.`);
      return;
    }

    // Check question length limits
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.question.length > MAX_QUESTION_LENGTH) {
        alert(`Question ${i + 1} exceeds maximum length of ${MAX_QUESTION_LENGTH} characters.`);
        return;
      }
      
      for (let j = 0; j < q.options.length; j++) {
        if (q.options[j].length > MAX_OPTION_LENGTH) {
          alert(`Question ${i + 1}, Option ${j + 1} exceeds maximum length of ${MAX_OPTION_LENGTH} characters.`);
          return;
        }
      }
    }

    if (!isAssignmentValid()) {
      alert('Please fill in the assignment title and at least one complete question.');
      return;
    }

    setIsSaving(true);
    
    try {
      const assignmentJSON = convertToAssignmentJSON(questions);
      const result = await saveAssignmentToAPI(assignmentJSON);
      
      const action = isEditing ? 'updated' : 'saved';
      alert(`Assignment "${assignmentTitle}" ${action} successfully! ID: ${result.assignmentId || result.id}`);
      
      // Close the modal
      window.dispatchEvent(new Event("close-assignment-modal"));
    } catch (error) {
      alert('Failed to save assignment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    window.dispatchEvent(new Event("close-assignment-modal"));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-teal-800">
              {isEditing ? 'Edit Assignment' : 'Assignment Creator'}
            </h1>
            <div className="flex items-center gap-3">
              <KaTeXHelp />
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Close"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area - Full Height with Scroll */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            {/* Assignment Title */}
            <div className="mb-6 p-4 bg-blue-50 rounded-md border border-slate-600/30">
              <label className="block text-teal-800 font-medium mb-2">
                Assignment Title *
              </label>
              <input
                type="text"
                placeholder="Enter assignment title"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                className="w-full p-3 border rounded-md text-gray-800 focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>

            {/* Assignment Settings */}
            <div className="mb-6 p-4 bg-teal-50 rounded-md border border-teal-200">
              <h3 className="text-teal-800 font-medium mb-3">Assignment Settings</h3>
              
              <div className="space-y-3">
                {/* Grading Option */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="gradedForPoints"
                    checked={isGradedForPoints}
                    onChange={(e) => setIsGradedForPoints(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <label htmlFor="gradedForPoints" className="text-teal-800 font-medium">
                    Grade this assignment for points
                  </label>
                </div>
                {!isGradedForPoints && (
                  <div className="ml-7 text-sm text-teal-600">
                    Students will see completion status only, no scores or grades
                  </div>
                )}

                {/* Show Correct Answers Option */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showCorrectAnswers"
                    checked={showCorrectAnswers}
                    onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <label htmlFor="showCorrectAnswers" className="text-teal-800 font-medium">
                    Show correct answers to students after submission
                  </label>
                </div>
                {!showCorrectAnswers && (
                  <div className="ml-7 text-sm text-teal-600">
                    Students will only see if they got questions right/wrong, not which answers were correct
                  </div>
                )}
              </div>
            </div>

            {/* Questions */}
            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="space-y-4 border border-gray-200 p-4 rounded-md bg-white shadow-sm mb-6"
              >
                {/* Question Header with Points */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-teal-800">Question {qIndex + 1}</h2>
                  {isGradedForPoints && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={q.points}
                        onChange={(e) => updateQuestion(qIndex, { points: parseInt(e.target.value) || 1 })}
                        className="w-16 p-2 border rounded-md text-gray-800 focus:ring-2 focus:ring-teal-500 text-center"
                      />
                      <span className="text-gray-600 text-sm">pts</span>
                    </div>
                  )}
                  {!isGradedForPoints && (
                    <span className="text-sm text-gray-500 italic">Not graded</span>
                  )}
                </div>

                {/* Question Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-teal-800 font-medium">Question Text *</label>
                    <button
                      type="button"
                      onClick={() => updateQuestion(qIndex, { showQuestionPreview: !q.showQuestionPreview })}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      {q.showQuestionPreview ? 'Hide' : 'Show'} Preview
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <textarea
                        placeholder="Enter question (supports LaTeX: $x^2$ for inline, $$x^2$$ for display)"
                        value={q.question}
                        onChange={(e) => {
                          if (e.target.value.length <= MAX_QUESTION_LENGTH) {
                            updateQuestion(qIndex, { question: e.target.value });
                          }
                        }}
                        readOnly={!q.questionEditable}
                        className={`w-full p-2 border rounded-md text-gray-800 ${
                          !q.questionEditable ? "bg-gray-100" : ""
                        }`}
                        maxLength={MAX_QUESTION_LENGTH}
                        rows={3}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {q.question.length}/{MAX_QUESTION_LENGTH} characters
                      </div>
                    </div>
                    {q.questionEditable ? (
                      <button 
                        onClick={() => updateQuestion(qIndex, { questionEditable: false })} 
                        title="Save"
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => updateQuestion(qIndex, { questionEditable: true })} 
                        title="Edit"
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Question Preview */}
                  {q.showQuestionPreview && q.question && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-xs text-blue-800 font-medium mb-2">LaTeX Preview:</div>
                      <KaTeXRenderer className="text-gray-800">{q.question}</KaTeXRenderer>
                    </div>
                  )}
                </div>

                {/* Number of Options */}
                <div className="flex items-center gap-4">
                  <label className="text-teal-800 font-medium">
                    Number of choices:
                  </label>
                  <select
                    className="p-2 border rounded-md text-gray-800 font-medium"
                    onChange={(e) => handleNumOptionsChange(qIndex, parseInt(e.target.value))}
                    value={q.options.length}
                  >
                    <option value={0}>Select</option>
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Correct Answer Instructions */}
                {q.options.length > 0 && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-md">
                    <p className="text-sm text-teal-800 font-medium">
                      ✓ Check the boxes next to the correct answer(s)
                    </p>
                  </div>
                )}

                {/* Options with Checkboxes */}
                {q.options.map((opt, i) => {
                  const isChecked = q.correctAnswers.includes(i);
                  console.log(`🔍 Question ${qIndex}, Option ${i}: checked=${isChecked}, correctAnswers=${JSON.stringify(q.correctAnswers)}`);
                  
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-teal-700">Option {i + 1}</label>
                        <button
                          type="button"
                          onClick={() => {
                            const newPreviews = [...(q.showOptionPreviews || [])];
                            newPreviews[i] = !newPreviews[i];
                            updateQuestion(qIndex, { showOptionPreviews: newPreviews });
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          {q.showOptionPreviews?.[i] ? 'Hide' : 'Show'} Preview
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            console.log(`🔍 Checkbox clicked for question ${qIndex}, option ${i}`);
                            handleCorrectAnswerToggle(qIndex, i);
                          }}
                          className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                          title="Check if this is a correct answer"
                        />
                        <input
                          type="text"
                          value={opt}
                          readOnly={!q.optionsEditable}
                          onChange={(e) => {
                            if (e.target.value.length <= MAX_OPTION_LENGTH) {
                              handleOptionChange(qIndex, i, e.target.value);
                            }
                          }}
                          placeholder={`Option ${i + 1} (supports LaTeX: $x^2$)`}
                          className={`flex-1 p-2 border rounded-md text-gray-900 ${
                            !q.optionsEditable ? "bg-gray-100" : ""
                          }`}
                          maxLength={MAX_OPTION_LENGTH}
                        />
                      </div>
                      
                      <div className="text-xs text-gray-500 ml-8">
                        {opt.length}/{MAX_OPTION_LENGTH} characters
                      </div>
                      
                      {/* Option Preview */}
                      {q.showOptionPreviews?.[i] && opt && (
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md ml-8">
                          <div className="text-xs text-blue-800 font-medium mb-1">LaTeX Preview:</div>
                          <KaTeXRenderer className="text-gray-800">{opt}</KaTeXRenderer>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Save/Edit Buttons for Options */}
                {q.options.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-teal-800 font-medium">
                      {q.correctAnswers.length > 0 && (
                        <span className="text-teal-600">
                          {q.correctAnswers.length} correct answer{q.correctAnswers.length !== 1 ? 's' : ''} selected
                        </span>
                      )}
                    </p>
                    {q.optionsEditable ? (
                      <button 
                        onClick={() => updateQuestion(qIndex, { optionsEditable: false })} 
                        title="Save"
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => updateQuestion(qIndex, { optionsEditable: true })} 
                        title="Edit"
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Explanation */}
                <div>
                  {!q.showExplanation ? (
                    <button
                      onClick={() => updateQuestion(qIndex, { showExplanation: true })}
                      className="mt-4 text-orange-600 px-3 py-2 rounded-md hover:bg-orange-100 transition"
                    >
                      + Add Explanation
                    </button>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-teal-700">Explanation (optional)</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(qIndex, { showExplanationPreview: !q.showExplanationPreview })}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            {q.showExplanationPreview ? 'Hide' : 'Show'} Preview
                          </button>
                          <button
                            onClick={() => updateQuestion(qIndex, { showExplanation: false, explanation: "" })}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={q.explanation}
                        onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                        placeholder="Enter explanation (supports LaTeX: $x^2$ for inline, $$x^2$$ for display)"
                        className="w-full p-2 border rounded-md text-gray-900"
                        rows={3}
                      />
                      
                      {/* Explanation Preview */}
                      {q.showExplanationPreview && q.explanation && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="text-xs text-blue-800 font-medium mb-2">LaTeX Preview:</div>
                          <KaTeXRenderer className="text-gray-800">{q.explanation}</KaTeXRenderer>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Footer with Buttons */}
        <div className="border-t bg-white p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex justify-between gap-4">
            <button
              onClick={handleNextQuestion}
              disabled={questions.length >= MAX_QUESTIONS}
              className={`px-4 py-2 rounded transition ${
                questions.length >= MAX_QUESTIONS
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'text-red-500 hover:bg-red-200'
              }`}
            >
              + Question ({questions.length}/{MAX_QUESTIONS})
            </button>
            
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded transition hover:bg-teal-700"
              >
                <FileText size={20}/>
                Save as Draft
              </button>
              
              <button
                onClick={handleSaveAssignment}
                disabled={!isAssignmentValid() || isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded transition ${
                  isAssignmentValid() && !isSaving
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'bg-teal-500 text-white cursor-not-allowed'
                }`}
              >
                <Send size={20}/>
                {isSaving ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update' : 'Submit')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};