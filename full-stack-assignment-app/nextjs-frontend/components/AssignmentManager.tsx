'use client';

import { useState, useEffect } from 'react';
import { X, Pencil, BarChart3, Eye } from 'lucide-react';
import { Assignment } from '@/types';

interface AssignmentManagerProps {
  userId: string;
}

export const AssignmentManager = ({ userId }: AssignmentManagerProps) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle close
  const handleClose = () => {
    window.dispatchEvent(new CustomEvent('close-assignment-manager'));
  };

  // Handle edit assignment
  const handleEditAssignment = (assignment: Assignment) => {
    window.dispatchEvent(new CustomEvent('edit-assignment', { 
      detail: assignment 
    }));
  };

  // Handle view student results
  const handleViewStudentResults = (assignment: Assignment) => {
    window.dispatchEvent(new CustomEvent('view-student-results', { 
      detail: assignment 
    }));
  };

  // Fetch assignments for teacher
  const fetchAssignments = async () => {
    setLoading(true);
    console.log('🔍 FRONTEND DEBUG: Starting to fetch assignments...');
    console.log('🔍 Using userId:', userId);
    
    try {
      const url = `/api/assignments?userId=${userId}&requestingUserId=${userId}&userRole=teacher`;
      console.log('🔍 Fetching from URL:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Assignments fetched successfully:', data);
        
        if (data.assignments && Array.isArray(data.assignments)) {
          console.log(`✅ Found ${data.assignments.length} assignments`);
          console.log('🔍 Data type received:', data.dataType);
          
          data.assignments.forEach((assignment: Assignment) => {
            console.log(`📄 Assignment ID: ${assignment.assignmentId}, Title: "${assignment.title}", Owner: ${assignment.assignmentOwnerId}`);
          });
          
          setAssignments(data.assignments);
        } else {
          console.log('❌ NO ASSIGNMENTS RETURNED from API');
          setAssignments([]);
        }
        
        if (data.debug) {
          console.log('🔍 Debug info from backend:', data.debug);
        }
      } else {
        console.error('❌ API response not ok:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error response body:', errorText);
        setAssignments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
      console.log('🔍 Finished fetching assignments');
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [userId]);

  // Calculate total points for an assignment
  const getTotalPoints = (questions: { [key: string]: any } | undefined | null): number => {
    if (!questions || typeof questions !== 'object') {
      return 0;
    }
    return Object.values(questions).reduce((total, question) => {
      return total + (question?.points || 0);
    }, 0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-bold text-teal-800">
          Manage Assignments
        </h2>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No assignments found.</p>
            <button
              onClick={handleClose}
              className="mt-4 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700"
            >
              Create Your First Assignment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <div
                key={`${assignment.userId}-${assignment.assignmentId}`}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {assignment.title}
                    </h3>
                    <div className="text-sm text-gray-600 mt-1">
                      <span>Questions: {assignment.totalQuestions}</span>
                      <span className="mx-2">•</span>
                      <span>Points: {getTotalPoints(assignment.questions)}</span>
                      <span className="mx-2">•</span>
                      <span>Created: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Owner: {assignment.assignmentOwnerId} | Creator: {assignment.userId}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEditAssignment(assignment)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Edit Assignment"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleViewStudentResults(assignment)}
                      className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      title="View Student Results"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Results
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};