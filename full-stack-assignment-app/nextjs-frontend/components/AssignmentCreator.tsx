"use client";

import React, { useState, useEffect } from "react";
import { Check, Pencil, Save } from "lucide-react";

type QuestionData = {
  question: string;
  questionEditable: boolean;
  options: string[];
  optionsEditable: boolean;
  correctCount: number;
  correctAnswers: number[];
  explanation: string;
  showExplanation: boolean;
  points: number;
};

// JSON structure for API
interface AssignmentQuestion {
  question: string;
  options: string[];
  correctOptions: number[];
  explanation: string;
  questionType: 'single' | 'multiple';
  points: number;
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
  points: 1,
});

// Types for editing
interface Assignment {
  assignmentId: string;
  title: string;
  questions: { [key: string]: AssignmentQuestion };
  createdAt: string;
  totalQuestions: number;
  status: string;
}

interface AssignmentCreatorProps {
  editingAssignment?: Assignment | null;
}

export const AssignmentCreator = ({ editingAssignment }: AssignmentCreatorProps) => {
  const [questions, setQuestions] = useState<QuestionData[]>([defaultQuestion()]);
  const [numOptions, setNumOptions] = useState<number[]>([0]);
  const [assignmentTitle, setAssignmentTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Load assignment data when editing
  useEffect(() => {
    if (editingAssignment) {
      setIsEditing(true);
      setAssignmentTitle(editingAssignment.title);
      
      // Convert API format back to form format
      const formQuestions: QuestionData[] = [];
      const optionCounts: number[] = [];
      
      Object.entries(editingAssignment.questions).forEach(([key, question]) => {
        const formQuestion: QuestionData = {
          question: question.question,
          questionEditable: false, // Start in view mode
          options: question.options,
          optionsEditable: false, // Start in view mode
          correctCount: question.correctOptions.length,
          correctAnswers: question.correctOptions,
          explanation: question.explanation,
          showExplanation: question.explanation.length > 0,
          points: question.points
        };
        
        formQuestions.push(formQuestion);
        optionCounts.push(question.options.length);
      });
      
      setQuestions(formQuestions);
      setNumOptions(optionCounts);
    } else {
      // Reset for new assignment
      setIsEditing(false);
      setAssignmentTitle("");
      setQuestions([defaultQuestion()]);
      setNumOptions([0]);
    }
  }, [editingAssignment]);

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
    setQuestions((prev) => [...prev, defaultQuestion()]);
    setNumOptions((prev) => [...prev, 0]);
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
          questionType: question.correctAnswers.filter(answer => answer !== -1).length > 1 ? 'multiple' : 'single',
          points: question.points
        };
      }
    });
    
    return assignmentData;
  };

  // Validation function
  const isAssignmentValid = (): boolean => {
    if (!assignmentTitle.trim()) return false;
    
    return questions.some(q => {
      return q.question.trim() !== '' && 
             q.options.length > 0 && 
             q.options.some(opt => opt.trim() !== '') &&
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
          totalQuestions: Object.keys(assignmentData).length,
          questionTypes: Object.values(assignmentData).map(q => q.questionType)
        }
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
      console.log('Assignment saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error saving assignment:', error);
      throw error;
    }
  };

  // Handle save assignment
  const handleSaveAssignment = async () => {
    if (!isAssignmentValid()) {
      alert('Please fill in the assignment title and at least one complete question.');
      return;
    }

    setIsSaving(true);
    
    try {
      const assignmentJSON = convertToAssignmentJSON(questions);
      console.log('Converting to JSON:', JSON.stringify(assignmentJSON, null, 2));
      
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

  return (
    <div
      className="w-11/12 h-full overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <h1 className="text-2xl font-bold text-teal-800 mb-4 text-center">
        {isEditing ? 'Edit Assignment' : 'Assignment Creator'}
      </h1>

      {/* Assignment Title */}
      <div className="mb-6 p-4 bg-blue-50 rounded-md border">
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

      {questions.map((q, qIndex) => (
        <div
          key={qIndex}
          className="space-y-4 border border-gray-200 p-4 rounded-md bg-white shadow-sm mb-6"
        >
          <h2 className="text-xl font-semibold text-teal-800">Question {qIndex + 1}</h2>

          {/* Question Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter question"
              value={q.question}
              onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
              readOnly={!q.questionEditable}
              className={`w-full p-2 border rounded-md text-gray-800 ${
                !q.questionEditable ? "bg-gray-100" : ""
              }`}
            />
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

          {/* Point Value */}
          <div className="flex items-center gap-2">
            <label className="text-teal-800 font-medium">
              Point Value:
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={q.points}
              onChange={(e) => updateQuestion(qIndex, { points: parseInt(e.target.value) || 1 })}
              className="w-20 p-2 border rounded-md text-gray-800 focus:ring-2 focus:ring-teal-500"
            />
            <span className="text-gray-600 text-sm">points</span>
          </div>

          {/* Number of Options */}
          <label className="block text-teal-800 font-medium">
            How many choices?
            <select
              className="ml-2 p-2 border rounded-md"
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
          </label>

          {/* Save/Edit Buttons for Options */}
          {q.options.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-teal-800 font-medium">Answer Choices:</p>
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

          {/* Options */}
          {q.options.map((opt, i) => (
            <input
              key={i}
              type="text"
              value={opt}
              readOnly={!q.optionsEditable}
              onChange={(e) => handleOptionChange(qIndex, i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className={`w-full p-2 border rounded-md mt-2 text-gray-900 ${
                !q.optionsEditable ? "bg-gray-100" : ""
              }`}
            />
          ))}

          {/* Correct Answer Count and Selection */}
          {q.options.length > 0 && (
            <>
              <label className="block mt-4 text-teal-800 font-medium">
                How many correct options?
                <select
                  className="ml-2 p-2 border rounded-md"
                  value={q.correctCount}
                  onChange={(e) => {
                    const count = parseInt(e.target.value);
                    updateQuestion(qIndex, {
                      correctCount: count,
                      correctAnswers: Array(count).fill(-1),
                    });
                  }}
                >
                  <option value={0}>Select</option>
                  {[...Array(q.options.length).keys()].map((n) => (
                    <option key={n + 1} value={n + 1}>
                      {n + 1}
                    </option>
                  ))}
                </select>
              </label>

              {q.correctAnswers.map((val, idx) => (
                <div key={idx}>
                  <label className="text-teal-700">
                    Correct Option {idx + 1}:
                    <select
                      className="ml-2 p-2 border rounded-md"
                      value={val}
                      onChange={(e) => {
                        const updated = [...q.correctAnswers];
                        updated[idx] = parseInt(e.target.value);
                        updateQuestion(qIndex, { correctAnswers: updated });
                      }}
                    >
                      <option value={-1}>Select</option>
                      {q.options.map((_, i) => (
                        <option key={i} value={i}>
                          Option {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </>
          )}

          {/* Explanation */}
          <div>
            <button
              onClick={() => updateQuestion(qIndex, { showExplanation: true })}
              className="mt-4 bg-orange-400 text-white px-3 py-2 rounded-md hover:bg-orange-500 transition"
            >
              + Add Explanation
            </button>
            {q.showExplanation && (
              <textarea
                value={q.explanation}
                onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                placeholder="Enter explanation (optional)"
                className="w-full mt-2 p-2 border rounded-md text-gray-900"
                rows={3}
              />
            )}
          </div>
        </div>
      ))}

      {/* Add Question + Save Buttons */}
      <div className="flex justify-between gap-4 mt-6">
        <button
          onClick={handleNextQuestion}
          className="bg-red-400 text-white px-4 py-2 rounded hover:bg-red-500 transition"
        >
          + Add Question
        </button>
        <button
          onClick={handleSaveAssignment}
          disabled={!isAssignmentValid() || isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded transition ${
            isAssignmentValid() && !isSaving
              ? 'bg-teal-600 text-white hover:bg-teal-700'
              : 'bg-teal-600 text-white cursor-not-allowed'
          }`}
        >
          <Save size={20}/>
          {isSaving ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update' : 'Save')}
        </button>
      </div>
    </div>
  );
};