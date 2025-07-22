'use client';

import { useState, useEffect } from 'react';
import { AssignmentCreator } from '@/components/AssignmentCreator';
import { AssignmentViewer } from '@/components/AssignmentViewer';
import { StudentResultsViewer } from '@/components/StudentResultsViewer';
import { useUser } from '@/contexts/UserContext';
import { X, Pencil, Eye, Play, User, BarChart3, GraduationCap, Users } from 'lucide-react';

// Import types for compatibility
import { Assignment, CleanAssignment, cleanToComponentAssignment, verifyStudentDataSecurity } from '@/types';

// ⭐ Keep original Assignment interface for component compatibility - remove the conflicting type definitions
// Remove the interface definitions that were causing conflicts

export default function Home() {
  const { userId, isTeacher, assignmentOwnerId } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignmentViewer, setShowAssignmentViewer] = useState(false);
  const [showStudentResults, setShowStudentResults] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [studentId, setStudentId] = useState('');
  const [userMode, setUserMode] = useState<'teacher' | 'student'>('teacher');

  // Listen for global modal-close event
  useEffect(() => {
    const handler = () => {
      setShowCreateModal(false);
      setEditingAssignment(null);
    };
    window.addEventListener("close-assignment-modal", handler);
    return () => window.removeEventListener("close-assignment-modal", handler);
  }, []);

  // ⭐ NEW: Security verification function
  const verifyDataSecurity = (assignment: Assignment, userMode: 'teacher' | 'student') => {
    if (userMode === 'student') {
      return verifyStudentDataSecurity(assignment);
    }
    return true;
  };

  // ⭐ UPDATED: Fetch assignments with security parameters
  const fetchAssignments = async () => {
    setLoading(true);
    console.log('🔍 FRONTEND DEBUG: Starting to fetch assignments...');
    console.log('🔍 Using userId:', userId);
    console.log('🔍 User mode:', userMode);
    
    try {
      // ⭐ NEW: Include user role and security parameters in request
      const url = userMode === 'teacher' 
        ? `/api/assignments?userId=${userId}&requestingUserId=${userId}&userRole=teacher`
        : `/api/assignments?requestingUserId=${userId}&userRole=student`;
      
      console.log('🔍 Fetching from URL:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Assignments fetched successfully:', data);
        
        if (data.assignments && Array.isArray(data.assignments)) {
          console.log(`✅ Found ${data.assignments.length} assignments`);
          console.log('🔍 Data type received:', data.dataType); // ⭐ NEW: Shows if data is clean or complete
          
          // ⭐ NEW: Convert clean assignments to component-compatible format if needed
          let processedAssignments: Assignment[] = data.assignments;
          
          if (data.dataType === 'student-safe') {
            processedAssignments = data.assignments.map((assignment: any) => 
              cleanToComponentAssignment(assignment as CleanAssignment)
            );
          } else {
          console.log('❌ NO ASSIGNMENTS RETURNED from API');
        }
        
        // Check for debug info from backend
        if (data.debug) {
          console.log('🔍 Debug info from backend:', data.debug);
        }
          
          processedAssignments.forEach((assignment: Assignment) => {
            console.log(`📄 Assignment ID: ${assignment.assignmentId}, Title: "${assignment.title}", Owner: ${assignment.assignmentOwnerId}`);
            
            // ⭐ NEW: Security verification - ensure correct answers are not present in student data
            if (userMode === 'student') {
              if (!verifyDataSecurity(assignment, 'student')) {
                alert('Security Error: Please contact administrator');
              } else {
                console.log('✅ Student data is secure - no correct answers exposed');
              }
            } else {
              console.log('📚 Teacher data includes complete assignment information');
            }
          });
          
          setAssignments(processedAssignments);
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

  // Handle view assignments
  const handleViewAssignments = () => {
    setShowViewModal(true);
    fetchAssignments();
  };

  // Handle edit assignment (teacher only)
  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setShowViewModal(false);
    setShowCreateModal(true);
  };

  // ⭐ UPDATED: Handle take assignment with security checks
  const handleTakeAssignment = (assignment: Assignment) => {
    if (!studentId.trim()) {
      alert('Please enter your Student ID first');
      return;
    }
    
    // ⭐ NEW: Verify assignment data is secure before opening
    if (!verifyDataSecurity(assignment, 'student')) {
      alert('Security Error: Cannot open assignment. Please contact administrator.');
      return;
    }
    
    console.log('✅ Assignment security verified - opening for student');
    setSelectedAssignment(assignment);
    setShowViewModal(false);
    setShowAssignmentViewer(true);
  };

  // Handle view student results (teacher only)
  const handleViewStudentResults = (assignment: Assignment) => {
    console.log('Opening results for assignment:', assignment);
    console.log('Assignment questions:', assignment.questions);
    setSelectedAssignment(assignment);
    setShowViewModal(false);
    setShowStudentResults(true);
  };

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
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* Mode Toggle */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
        <div className="flex items-center gap-4">
          <span className="text-gray-700 font-medium">Mode:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setUserMode('teacher')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                userMode === 'teacher'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Teacher
            </button>
            <button
              onClick={() => setUserMode('student')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                userMode === 'student'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Users className="h-4 w-4" />
              Student
            </button>
          </div>
        </div>

        {/* Student ID Input */}
        {userMode === 'student' && (
          <div className="mt-4 flex items-center gap-3">
            <User className="h-5 w-5 text-gray-600" />
            <input
              type="text"
              placeholder="Enter your Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            />
          </div>
        )}

        {/* Current User Info */}
        <div className="mt-4 text-sm text-gray-600">
          <div>Current User ID: {userId}</div>
          <div>Assignment Owner ID: {assignmentOwnerId}</div>
        </div>
      </div>

      {/* Main Buttons */}
      <div className="flex gap-4 mb-4">
        {userMode === 'teacher' && (
          <button
            className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Assignment
          </button>
        )}
        
        <button
          className={`text-white px-4 py-2 rounded-md transition flex items-center gap-2 ${
            userMode === 'teacher'
              ? 'bg-orange-400 hover:bg-orange-500'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          onClick={handleViewAssignments}
        >
          <Eye className="h-4 w-4" />
          {userMode === 'teacher' ? 'Manage Assignments' : 'Available Assignments'}
        </button>
      </div>

      {/* Create Assignment Modal - Full Screen */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="absolute inset-0 flex items-start justify-center p-4 min-h-screen">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[95vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingAssignment ? 'Edit Assignment' : 'Create Assignment'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingAssignment(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AssignmentCreator editingAssignment={editingAssignment} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Assignments Modal */}
      {showViewModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className={`text-xl font-bold ${
                  userMode === 'teacher' ? 'text-teal-800' : 'text-blue-800'
                }`}>
                  {userMode === 'teacher' ? 'Manage Assignments' : 'Available Assignments'}
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
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
                    <p className="text-gray-600">No assignments found.</p>
                    {userMode === 'teacher' && (
                      <button
                        onClick={() => {
                          setShowViewModal(false);
                          setShowCreateModal(true);
                        }}
                        className="mt-4 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700"
                      >
                        Create Your First Assignment
                      </button>
                    )}
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
                            {userMode === 'teacher' && (
                              <>
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
                              </>
                            )}
                            
                            {userMode === 'student' && (
                              <button
                                onClick={() => handleTakeAssignment(assignment)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                title="Take Assignment"
                              >
                                <Play className="h-4 w-4" />
                                Take
                              </button>
                            )}
                          </div>
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

      {/* Assignment Viewer Modal (Student taking assignment) */}
      {showAssignmentViewer && selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <AssignmentViewer
                assignment={selectedAssignment}
                studentId={studentId}
                assignmentOwnerId={selectedAssignment.assignmentOwnerId}
                onCloseAction={() => setShowAssignmentViewer(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Student Results Viewer Modal */}
      {showStudentResults && selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <StudentResultsViewer
                assignment={selectedAssignment}
                onCloseAction={() => setShowStudentResults(false)}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}