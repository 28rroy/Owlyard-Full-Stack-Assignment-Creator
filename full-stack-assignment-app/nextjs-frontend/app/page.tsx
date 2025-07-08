'use client';

import { useState, useEffect } from 'react';
import { AssignmentCreator } from '@/components/AssignmentCreator';
import { X, Pencil, Eye } from 'lucide-react';

// Types for assignment data
interface AssignmentQuestion {
  question: string;
  options: string[];
  correctOptions: number[];
  explanation: string;
  questionType: 'single' | 'multiple';
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

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

  // Listen for global modal-close event
  useEffect(() => {
    const handler = () => {
      setShowCreateModal(false);
      setEditingAssignment(null);
    };
    window.addEventListener("close-assignment-modal", handler);
    return () => window.removeEventListener("close-assignment-modal", handler);
  }, []);

  // Fetch assignments from API
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/get-assignments');
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      } else {
        console.error('Failed to fetch assignments');
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle view assignments
  const handleViewAssignments = () => {
    setShowViewModal(true);
    fetchAssignments();
  };

  // Handle edit assignment
  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setShowViewModal(false);
    setShowCreateModal(true);
  };

  // Calculate total points for an assignment
  const getTotalPoints = (questions: { [key: string]: AssignmentQuestion }): number => {
    return Object.values(questions).reduce((total, question) => total + question.points, 0);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* Main Buttons */}
      <div className="flex gap-4 mb-4">
        <button
          className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition"
          onClick={() => setShowCreateModal(true)}
        >
          + Create Assignment
        </button>
        
        <button
          className="bg-orange-400 text-white px-4 py-2 rounded-md hover:bg-orange-500 transition flex items-center gap-2"
          onClick={handleViewAssignments}
        >
          <Eye className="h-4 w-4" />
          View Assignments
        </button>
      </div>

      {/* Create/Edit Assignment Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50"
          style={{ isolation: 'isolate' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative flex items-center justify-center bg-blue-50 rounded-md shadow-lg p-6 w-full h-full z-20"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                isolation: 'isolate',
                touchAction: 'none',
                pointerEvents: 'auto',
                userSelect: 'none',
              }}
            >
              <button
                title="Close assignment creator"
                className="absolute top-2 right-2 sm:top-5 sm:right-5 z-10 p-2.5
                rounded-full bg-red-400 hover:bg-red-500
                text-white shadow-lg
                transform transition-all duration-200
                hover:scale-110 hover:shadow-red-400/50
                focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2
                active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(false);
                  setEditingAssignment(null);
                }}
              >
                <X className="h-4 w-4" />
              </button>

              <AssignmentCreator editingAssignment={editingAssignment} />
            </div>
          </div>
        </div>
      )}

      {/* View Assignments Modal */}
      {showViewModal && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="absolute inset-0 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-teal-800">My Assignments</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading assignments...</p>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No assignments found. Create your first assignment!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.assignmentId}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-teal-800 mb-2">
                              {assignment.title}
                            </h3>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span>📝 {assignment.totalQuestions} questions</span>
                              <span>🎯 {getTotalPoints(assignment.questions)} total points</span>
                              <span>📅 {new Date(assignment.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleEditAssignment(assignment)}
                            className="p-2 text-orange-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
                            title="Edit Assignment"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}