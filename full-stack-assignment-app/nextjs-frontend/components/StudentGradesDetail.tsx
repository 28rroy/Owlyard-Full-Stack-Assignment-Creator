'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, ArrowLeft, FileText, Calendar, Award, Target, TrendingUp, Clock, User, Search, Filter, BarChart3, Eye, Download, ArrowUpDown } from 'lucide-react';

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
  assignmentOwnerId?: string;
  assignmentTitle?: string;
}

interface StudentGradesDetailProps {
  studentId: string;
}

export const StudentGradesDetail = ({ studentId }: StudentGradesDetailProps) => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | '30d' | '90d' | '1y'>('all');
  const [classAverages, setClassAverages] = useState<{[assignmentId: string]: number}>({});
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalAssignments: 0,
    totalScore: 0,
    totalPoints: 0,
    averagePercentage: 0,
    highestScore: 0,
    lowestScore: 100,
    improvementTrend: 0,
    recentAverage: 0
  });

  // Handle close
  const handleClose = () => {
    window.dispatchEvent(new CustomEvent('close-student-grades-detail'));
  };

  // Handle back
  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('back-to-grades-manager'));
  };

  // Fetch class averages for comparison
  const fetchClassAverages = async (assignmentIds: string[]) => {
    try {
      const averages: {[key: string]: number} = {};
      
      for (const assignmentId of assignmentIds) {
        const response = await fetch(
          `/api/grades?assignmentId=${assignmentId}&action=get-all-grades-for-assignment`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.grades && data.grades.length > 0) {
            const totalPercentage = data.grades.reduce((sum: number, grade: any) => sum + grade.percentage, 0);
            averages[assignmentId] = Math.round(totalPercentage / data.grades.length);
          }
        }
      }
      
      setClassAverages(averages);
    } catch (error) {
      console.error('Error fetching class averages:', error);
    }
  };

  // Calculate improvement trend (comparing recent vs older assignments)
  const calculateTrend = (sortedGrades: Grade[]) => {
    if (sortedGrades.length < 2) return 0;
    
    const recentCount = Math.min(3, Math.floor(sortedGrades.length / 2));
    const recentGrades = sortedGrades.slice(0, recentCount);
    const olderGrades = sortedGrades.slice(-recentCount);
    
    const recentAverage = recentGrades.reduce((sum, grade) => sum + grade.percentage, 0) / recentGrades.length;
    const olderAverage = olderGrades.reduce((sum, grade) => sum + grade.percentage, 0) / olderGrades.length;
    
    return recentAverage - olderAverage;
  };

  // Filter and sort grades
  const filteredAndSortedGrades = useMemo(() => {
    let filtered = grades.filter(grade => {
      // Search filter
      const matchesSearch = grade.assignmentTitle?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Time range filter
      const gradeDate = new Date(grade.submittedAt);
      const now = new Date();
      let matchesTimeRange = true;
      
      if (selectedTimeRange === '30d') {
        matchesTimeRange = (now.getTime() - gradeDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
      } else if (selectedTimeRange === '90d') {
        matchesTimeRange = (now.getTime() - gradeDate.getTime()) <= (90 * 24 * 60 * 60 * 1000);
      } else if (selectedTimeRange === '1y') {
        matchesTimeRange = (now.getTime() - gradeDate.getTime()) <= (365 * 24 * 60 * 60 * 1000);
      }
      
      return matchesSearch && matchesTimeRange;
    });
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      } else if (sortBy === 'score') {
        comparison = a.percentage - b.percentage;
      } else if (sortBy === 'name') {
        comparison = (a.assignmentTitle || '').localeCompare(b.assignmentTitle || '');
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }, [grades, searchTerm, sortBy, sortOrder, selectedTimeRange]);

  // Fetch all grades for this specific student
  const fetchStudentGrades = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(
        `/api/grades?userId=${studentId}&action=get-all-grades-for-user`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch student grades');
      }
      
      const data = await response.json();
      
      if (data.grades && data.grades.length > 0) {
        // Get assignment titles for each grade
        const gradesWithTitles = await Promise.all(
          data.grades.map(async (grade: Grade) => {
            try {
              const assignmentOwnerId = grade.assignmentOwnerId;
              
              if (!assignmentOwnerId) {
                return {
                  ...grade,
                  assignmentTitle: 'Unknown Assignment'
                };
              }
              
              // Fetch assignment details
              const assignmentResponse = await fetch(
                `/api/get-assignments?userId=${assignmentOwnerId}&assignmentId=${grade.assignmentId}`
              );
              
              if (assignmentResponse.ok) {
                const assignmentData = await assignmentResponse.json();
                
                // Handle different response formats
                let foundTitle = null;
                
                if (assignmentData.assignment) {
                  // Single assignment response
                  foundTitle = assignmentData.assignment.title;
                } else if (assignmentData.assignments && Array.isArray(assignmentData.assignments)) {
                  // Multiple assignments response - find the specific one
                  const specificAssignment = assignmentData.assignments.find(
                    (assignment: any) => assignment.assignmentId === grade.assignmentId
                  );
                  foundTitle = specificAssignment?.title;
                }
                
                return {
                  ...grade,
                  assignmentTitle: foundTitle || 'Unknown Assignment'
                };
              } else {
                // Fallback: get all assignments and find matching one
                const allAssignmentsResponse = await fetch(
                  `/api/get-assignments?userId=${assignmentOwnerId}`
                );
                
                if (allAssignmentsResponse.ok) {
                  const allAssignmentsData = await allAssignmentsResponse.json();
                  const matchingAssignment = allAssignmentsData.assignments?.find(
                    (assignment: any) => assignment.assignmentId === grade.assignmentId
                  );
                  
                  if (matchingAssignment) {
                    return {
                      ...grade,
                      assignmentTitle: matchingAssignment.title || 'Unknown Assignment'
                    };
                  }
                }
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
        const trend = calculateTrend(sortedGrades);
        
        // Calculate recent average (last 3 assignments)
        const recentGrades = sortedGrades.slice(0, Math.min(3, sortedGrades.length));
        const recentAverage = recentGrades.length > 0 
          ? Math.round(recentGrades.reduce((sum, grade) => sum + grade.percentage, 0) / recentGrades.length)
          : 0;
        
        setSummary({
          totalAssignments: sortedGrades.length,
          totalScore,
          totalPoints,
          averagePercentage: totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0,
          highestScore: Math.max(...percentages),
          lowestScore: Math.min(...percentages),
          improvementTrend: trend,
          recentAverage
        });
        
        // Fetch class averages for comparison
        const assignmentIds = sortedGrades.map(grade => grade.assignmentId);
        await fetchClassAverages(assignmentIds);
      } else {
        setGrades([]);
      }
      
    } catch (error) {
      console.error('Error fetching student grades:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load grades on component mount
  useEffect(() => {
    fetchStudentGrades();
  }, [studentId]);

  // Color scheme based on performance with proper contrast
  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-50 border-green-200 text-green-900';
    if (percentage >= 80) return 'bg-blue-50 border-blue-200 text-blue-900';
    if (percentage >= 70) return 'bg-yellow-50 border-yellow-200 text-yellow-900';
    return 'bg-red-50 border-red-200 text-red-900';
  };

  // Performance badges
  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 90) return { text: 'Excellent', color: 'bg-green-500' };
    if (percentage >= 80) return { text: 'Good', color: 'bg-blue-500' };
    if (percentage >= 70) return { text: 'Fair', color: 'bg-yellow-500' };
    return { text: 'Needs Improvement', color: 'bg-red-500' };
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading student grades...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Grades</span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <User className="h-6 w-6 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    Student Performance Dashboard
                  </h1>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {grades.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Grades Found</h3>
              <p className="text-gray-500">This student hasn't submitted any assignments yet.</p>
            </div>
          ) : (
            <>
              {/* Search and Filter Controls */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search assignments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <select
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
                      >
                        <option value="all">All Time</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="1y">Last Year</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-gray-500" />
                      <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [newSortBy, newSortOrder] = e.target.value.split('-');
                          setSortBy(newSortBy as any);
                          setSortOrder(newSortOrder as any);
                        }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
                      >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="score-desc">Highest Score</option>
                        <option value="score-asc">Lowest Score</option>
                        <option value="name-asc">Name A-Z</option>
                        <option value="name-desc">Name Z-A</option>
                      </select>
                    </div>
                    
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Download className="h-4 w-4" />
                      Export
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <FileText className="h-5 w-5" />
                    <span className="text-sm font-medium">Total Assignments</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {summary.totalAssignments}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {filteredAndSortedGrades.length !== summary.totalAssignments && 
                      `${filteredAndSortedGrades.length} shown`}
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-medium">Overall Average</span>
                  </div>
                  <div className={`text-3xl font-bold ${
                    summary.averagePercentage >= 90 ? 'text-green-600' :
                    summary.averagePercentage >= 80 ? 'text-blue-600' :
                    summary.averagePercentage >= 70 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {summary.averagePercentage}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Recent: {summary.recentAverage}%
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Award className="h-5 w-5" />
                    <span className="text-sm font-medium">Total Points</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {summary.totalScore}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    of {summary.totalPoints} possible
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Target className="h-5 w-5" />
                    <span className="text-sm font-medium">Score Range</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {summary.lowestScore}% - {summary.highestScore}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {summary.highestScore - summary.lowestScore}% spread
                  </div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-sm font-medium">Trend</span>
                  </div>
                  <div className={`text-2xl font-bold ${
                    summary.improvementTrend > 5 ? 'text-green-600' :
                    summary.improvementTrend < -5 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {summary.improvementTrend > 0 ? '+' : ''}{summary.improvementTrend.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {summary.improvementTrend > 0 ? 'Improving' : 
                     summary.improvementTrend < 0 ? 'Declining' : 'Stable'}
                  </div>
                </div>
              </div>

              {/* Performance Chart */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
                <div className="h-64 flex items-end justify-between gap-2">
                  {filteredAndSortedGrades.slice().reverse().map((grade, index) => {
                    const height = (grade.percentage / 100) * 100;
                    const classAverage = classAverages[grade.assignmentId];
                    
                    return (
                      <div key={grade.assignmentId} className="flex-1 flex flex-col items-center">
                        <div className="relative w-full max-w-16 h-48 bg-gray-100 rounded-t">
                          {/* Class average line */}
                          {classAverage && (
                            <div 
                              className="absolute w-full border-t-2 border-dashed border-gray-400"
                              style={{ bottom: `${(classAverage / 100) * 100}%` }}
                            />
                          )}
                          {/* Student score bar */}
                          <div 
                            className={`absolute bottom-0 w-full rounded-t transition-all duration-300 ${
                              grade.percentage >= 90 ? 'bg-green-500' :
                              grade.percentage >= 80 ? 'bg-blue-500' :
                              grade.percentage >= 70 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-2 text-center max-w-16 truncate">
                          {grade.assignmentTitle}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Student Score</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 border-t-2 border-dashed border-gray-400"></div>
                    <span>Class Average</span>
                  </div>
                </div>
              </div>

              {/* Individual Grades */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Assignment Details</h3>
                  <span className="text-sm text-gray-500">
                    Showing {filteredAndSortedGrades.length} of {grades.length} assignments
                  </span>
                </div>
                
                {filteredAndSortedGrades.map((grade, index) => {
                  const badge = getPerformanceBadge(grade.percentage);
                  const classAverage = classAverages[grade.assignmentId];
                  const isExpanded = expandedGrade === grade.assignmentId;
                  
                  return (
                    <div
                      key={`${grade.assignmentId}-${index}`}
                      className={`bg-white border border-gray-200 rounded-lg overflow-hidden transition-all hover:shadow-md ${
                        isExpanded ? 'shadow-lg' : ''
                      }`}
                    >
                      <div 
                        className="p-6 cursor-pointer"
                        onClick={() => setExpandedGrade(isExpanded ? null : grade.assignmentId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {grade.assignmentTitle}
                              </h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>
                                {badge.text}
                              </span>
                              {classAverage && (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  grade.percentage >= classAverage ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {grade.percentage >= classAverage ? 'Above' : 'Below'} Average
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(grade.submittedAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(grade.submittedAt).toLocaleTimeString()}</span>
                              </div>
                              {classAverage && (
                                <div className="flex items-center gap-1">
                                  <BarChart3 className="h-4 w-4" />
                                  <span>Class Avg: {classAverage}%</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Progress bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  grade.percentage >= 90 ? 'bg-green-500' :
                                  grade.percentage >= 80 ? 'bg-blue-500' :
                                  grade.percentage >= 70 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${grade.percentage}%` }}
                              />
                              {classAverage && (
                                <div 
                                  className="relative -mt-3 w-1 h-4 bg-gray-600"
                                  style={{ marginLeft: `${classAverage}%` }}
                                />
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right ml-6">
                            <div className="text-3xl font-bold text-gray-900 mb-1">
                              {grade.percentage}%
                            </div>
                            <div className="text-sm text-gray-600">
                              {grade.score}/{grade.totalPoints} points
                            </div>
                            <button className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm">
                              <Eye className="h-4 w-4" />
                              {isExpanded ? 'Hide' : 'View'} Details
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50 p-6">
                          <h5 className="font-semibold text-gray-900 mb-3">Question Breakdown</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {grade.gradingDetails?.map((detail: any, idx: number) => (
                              <div key={idx} className="bg-white rounded-lg p-3 border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-900">Question {idx + 1}</span>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    detail.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {detail.isCorrect ? 'Correct' : 'Incorrect'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600">
                                  {detail.isCorrect ? detail.maxPoints || 1 : 0} / {detail.maxPoints || 1} points
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {classAverage && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-blue-900">Performance vs Class</span>
                                <span className={`font-bold ${
                                  grade.percentage >= classAverage ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {grade.percentage - classAverage > 0 ? '+' : ''}{(grade.percentage - classAverage).toFixed(1)}% vs class average
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};