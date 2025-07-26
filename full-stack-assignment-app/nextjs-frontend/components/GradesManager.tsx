'use client';

import { useState, useEffect } from 'react';
import { X, User, TrendingUp, Calendar, Award } from 'lucide-react';

interface Grade {
  assignmentId: string;
  userId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  gradingDetails: any[];
  submittedAt: string;
  gradedAt: string;
  status: string;
  type: string;
  assignmentTitle?: string;
}

interface Assignment {
  assignmentId: string;
  title: string;
  userId: string;
  assignmentOwnerId: string;
  totalQuestions: number;
  createdAt: string;
}

interface GradesManagerProps {
  teacherId: string;
}

export const GradesManager = ({ teacherId }: GradesManagerProps) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentSummaries, setStudentSummaries] = useState<any[]>([]);

  // Handle close
  const handleClose = () => {
    window.dispatchEvent(new CustomEvent('close-grades-manager'));
  };

  // Handle view student grades
  const handleViewStudentGrades = (studentId: string) => {
    window.dispatchEvent(new CustomEvent('view-student-grades', { 
      detail: { studentId } 
    }));
  };

  // Fetch all grades for assignments created by this teacher
  const fetchAllGrades = async () => {
    setLoading(true);
    console.log('🔍 Fetching all grades for teacher:', teacherId);
    
    try {
      // First, get all assignments by this teacher to get the assignment titles
      const assignmentsResponse = await fetch(
        `/api/assignments?userId=${teacherId}&requestingUserId=${teacherId}&userRole=teacher`
      );
      
      if (!assignmentsResponse.ok) {
        throw new Error('Failed to fetch assignments');
      }
      
      const assignmentsData = await assignmentsResponse.json();
      const assignments = assignmentsData.assignments || [];
      
      console.log('✅ Found assignments:', assignments.length);
      
      // Create a map of assignmentId to title for quick lookup
      const assignmentTitles = new Map<string, string>();
      assignments.forEach((assignment: Assignment) => {
        assignmentTitles.set(assignment.assignmentId, assignment.title);
      });
      
      // Get grades for each assignment from gradesTable
      const allGrades: Grade[] = [];
      
      for (const assignment of assignments) {
        try {
          console.log('🔍 Fetching grades for assignment:', assignment.assignmentId);
          
          const gradesResponse = await fetch(
            `/api/grades?assignmentId=${assignment.assignmentId}&action=get-all-grades-for-assignment`
          );
          
          if (gradesResponse.ok) {
            const gradesData = await gradesResponse.json();
            if (gradesData.grades && gradesData.grades.length > 0) {
              // Add assignment title to each grade for context
              const gradesWithTitle = gradesData.grades.map((grade: Grade) => ({
                ...grade,
                assignmentTitle: assignment.title
              }));
              allGrades.push(...gradesWithTitle);
              console.log(`✅ Found ${gradesData.grades.length} grades for assignment ${assignment.title}`);
            }
          }
        } catch (error) {
          console.error('❌ Error fetching grades for assignment:', assignment.assignmentId, error);
        }
      }
      
      console.log('✅ Total grades found:', allGrades.length);
      setGrades(allGrades);
      
      // Create student summaries
      const studentMap = new Map();
      
      allGrades.forEach((grade: any) => {
        if (!studentMap.has(grade.userId)) {
          studentMap.set(grade.userId, {
            studentId: grade.userId,
            totalAssignments: 0,
            totalScore: 0,
            totalPoints: 0,
            averagePercentage: 0,
            lastSubmission: grade.submittedAt,
            grades: []
          });
        }
        
        const student = studentMap.get(grade.userId);
        student.totalAssignments += 1;
        student.totalScore += grade.score;
        student.totalPoints += grade.totalPoints;
        student.grades.push(grade);
        
        // Update last submission if this one is more recent
        if (new Date(grade.submittedAt) > new Date(student.lastSubmission)) {
          student.lastSubmission = grade.submittedAt;
        }
      });
      
      // Calculate averages and sort by student ID
      const summaries = Array.from(studentMap.values()).map((student: any) => ({
        ...student,
        averagePercentage: student.totalPoints > 0 
          ? Math.round((student.totalScore / student.totalPoints) * 100)
          : 0
      })).sort((a, b) => a.studentId.localeCompare(b.studentId));
      
      console.log('✅ Student summaries created:', summaries.length);
      setStudentSummaries(summaries);
      
    } catch (error) {
      console.error('❌ Error fetching grades:', error);
      setGrades([]);
      setStudentSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllGrades();
  }, [teacherId]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-bold text-purple-800">
          All Student Grades
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading student grades...</p>
          </div>
        ) : studentSummaries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No student grades found.</p>
            <p className="text-sm text-gray-500 mt-2">
              Students need to take assignments first for grades to appear here.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Found {studentSummaries.length} students with {grades.length} total submissions
            </div>
            
            <div className="space-y-4">
              {studentSummaries.map((student) => (
                <div
                  key={student.studentId}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50"
                  onClick={() => handleViewStudentGrades(student.studentId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
                        <User className="h-5 w-5 text-purple-600" />
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {student.studentId}
                        </h3>
                        <div className="text-sm text-gray-600">
                          {student.totalAssignments} assignment{student.totalAssignments !== 1 ? 's' : ''} completed
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-gray-600">
                          <TrendingUp className="h-4 w-4" />
                          <span>Average</span>
                        </div>
                        <div className={`text-lg font-bold ${
                          student.averagePercentage >= 90 ? 'text-green-600' :
                          student.averagePercentage >= 80 ? 'text-blue-600' :
                          student.averagePercentage >= 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {student.averagePercentage}%
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Award className="h-4 w-4" />
                          <span>Score</span>
                        </div>
                        <div className="text-lg font-bold text-gray-800">
                          {student.totalScore}/{student.totalPoints}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Last</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(student.lastSubmission).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          student.averagePercentage >= 90 ? 'bg-green-500' :
                          student.averagePercentage >= 80 ? 'bg-blue-500' :
                          student.averagePercentage >= 70 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${student.averagePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};