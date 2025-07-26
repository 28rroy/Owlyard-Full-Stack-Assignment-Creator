'use client';

import { useState, useEffect } from 'react';
import { X, ArrowLeft, FileText, Calendar, Award, Target, TrendingUp } from 'lucide-react';

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

interface StudentGradesDetailProps {
  studentId: string;
}

export const StudentGradesDetail = ({ studentId }: StudentGradesDetailProps) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalAssignments: 0,
    totalScore: 0,
    totalPoints: 0,
    averagePercentage: 0,
    highestScore: 0,
    lowestScore: 100
  });

  // Handle close
  const handleClose = () => {
    window.dispatchEvent(new CustomEvent('close-student-grades-detail'));
  };

  // Handle back
  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('back-to-grades-manager'));
  };

  // Fetch all grades for this specific student
  const fetchStudentGrades = async () => {
    setLoading(true);
    console.log('🔍 Fetching grades for student:', studentId);
    
    try {
      const response = await fetch(
        `/api/grades?userId=${studentId}&action=get-all-grades-for-user`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch student grades');
      }
      
      const data = await response.json();
      console.log('✅ Student grades fetched:', data);
      
      if (data.grades && data.grades.length > 0) {
        // Get assignment titles for each grade
        const gradesWithTitles = await Promise.all(
          data.grades.map(async (grade: Grade) => {
            try {
              // Fetch assignment details to get the title
              const assignmentResponse = await fetch(
                `/api/assignments?assignmentId=${grade.assignmentId}&requestingUserId=${studentId}&userRole=student`
              );
              
              if (assignmentResponse.ok) {
                const assignmentData = await assignmentResponse.json();
                return {
                  ...grade,
                  assignmentTitle: assignmentData.assignment?.title || 'Unknown Assignment'
                };
              }
            } catch (error) {
              console.error('Error fetching assignment title:', error);
            }
            
            return {
              ...grade,
              assignmentTitle: 'Unknown Assignment'
            };
          })
        );
        
        // Sort by submission date (most recent first)
        const sortedGrades = gradesWithTitles.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
        
        setGrades(sortedGrades);
        
        // Calculate summary statistics
        const totalScore = sortedGrades.reduce((sum, grade) => sum + grade.score, 0);
        const totalPoints = sortedGrades.reduce((sum, grade) => sum + grade.totalPoints, 0);
        const percentages = sortedGrades.map(grade => grade.percentage);
        
        setSummary({
          totalAssignments: sortedGrades.length,
          totalScore,
          totalPoints,
          averagePercentage: totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0,
          highestScore: Math.max(...percentages),
          lowestScore: Math.min(...percentages)
        });
        
      } else {
        setGrades([]);
        setSummary({
          totalAssignments: 0,
          totalScore: 0,
          totalPoints: 0,
          averagePercentage: 0,
          highestScore: 0,
          lowestScore: 0
        });
      }
      
    } catch (error) {
      console.error('❌ Error fetching student grades:', error);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentGrades();
  }, [studentId]);

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 90) return { text: 'Excellent', color: 'bg-green-500' };
    if (percentage >= 80) return { text: 'Good', color: 'bg-blue-500' };
    if (percentage >= 70) return { text: 'Fair', color: 'bg-yellow-500' };
    return { text: 'Needs Improvement', color: 'bg-red-500' };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-purple-800">
            Grades for {studentId}
          </h2>
        </div>
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
        ) : grades.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No grades found for this student.</p>
            <p className="text-sm text-gray-500 mt-2">
              This student hasn't taken any assignments yet.
            </p>
          </div>
        ) : (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">Total Assignments</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">
                  {summary.totalAssignments}
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Average Score</span>
                </div>
                <div className={`text-2xl font-bold ${
                  summary.averagePercentage >= 90 ? 'text-green-600' :
                  summary.averagePercentage >= 80 ? 'text-blue-600' :
                  summary.averagePercentage >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {summary.averagePercentage}%
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Award className="h-4 w-4" />
                  <span className="text-sm">Total Points</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">
                  {summary.totalScore}/{summary.totalPoints}
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Target className="h-4 w-4" />
                  <span className="text-sm">Score Range</span>
                </div>
                <div className="text-lg font-bold text-gray-800">
                  {summary.lowestScore}% - {summary.highestScore}%
                </div>
              </div>
            </div>

            {/* Individual Grades */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Assignment History</h3>
              
              {grades.map((grade, index) => {
                const badge = getPerformanceBadge(grade.percentage);
                
                return (
                  <div
                    key={`${grade.assignmentId}-${index}`}
                    className={`border rounded-lg p-4 ${getGradeColor(grade.percentage)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold">
                            {grade.assignmentTitle}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>
                            {badge.text}
                          </span>
                        </div>
                        
                        <div className="text-sm opacity-75 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Submitted: {new Date(grade.submittedAt).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        <div className="text-sm opacity-75">
                          Assignment ID: {grade.assignmentId}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-3xl font-bold mb-1">
                          {grade.percentage}%
                        </div>
                        <div className="text-sm opacity-75">
                          {grade.score} / {grade.totalPoints} points
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-current opacity-60 transition-all duration-300"
                          style={{ width: `${grade.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};