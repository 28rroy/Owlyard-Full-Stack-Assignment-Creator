'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Pencil, BarChart3, Eye, Trash2, Search, Filter, Grid, List, Copy, Download, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import { Assignment } from '@/types';

interface AssignmentManagerProps {
  userId: string;
}

interface AssignmentStats {
  responseCount: number;
  averageScore: number;
  completionRate: number;
  lastActivity: string;
  difficultyLevel: 'Easy' | 'Medium' | 'Hard';
}

interface Grade {
  assignmentId: string;
  userId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  submittedAt: string;
  gradedAt: string;
  status: string;
  type: string;
}

export const AssignmentManager = ({ userId }: AssignmentManagerProps) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Bulk operations
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleClose = () => {
    window.dispatchEvent(new CustomEvent('close-assignment-manager'));
  };

  const handleEditAssignment = (assignment: Assignment) => {
    window.dispatchEvent(new CustomEvent('edit-assignment', { 
      detail: assignment 
    }));
  };

  const handleViewStudentResults = (assignment: Assignment) => {
    window.dispatchEvent(new CustomEvent('view-student-results', { 
      detail: assignment 
    }));
  };

  const handleDuplicateAssignment = async (assignment: Assignment) => {
    const newTitle = `${assignment.title} (Copy)`;
    
    const confirmDuplicate = confirm(
      `Create a copy of "${assignment.title}"?\n\nNew title: "${newTitle}"`
    );
    
    if (!confirmDuplicate) return;

    try {
      // console.log('🔄 Duplicating assignment:', assignment.assignmentId);
      
      const duplicatedAssignment = {
        ...assignment,
        title: newTitle,
        assignmentId: undefined,
        createdAt: new Date().toISOString()
      };

      const response = await fetch(`/api/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicatedAssignment),
      });

      if (response.ok) {
        const result = await response.json();
        // console.log('✅ Assignment duplicated successfully:', result);
        
        alert(`Assignment duplicated successfully as "${newTitle}"!`);
        fetchAssignments();
      } else {
        const error = await response.json();
        // console.error('❌ Duplicate failed:', error);
        alert(`Failed to duplicate assignment: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      // console.error('❌ Error duplicating assignment:', error);
      alert('Failed to duplicate assignment. Please try again.');
    }
  };

  const handleDeleteAssignment = async (assignment: Assignment) => {
    const confirmDelete = confirm(
      `Are you sure you want to delete "${assignment.title}"?\n\nThis action cannot be undone and will remove:\n- The assignment\n- All student responses\n- All associated data`
    );
    
    if (!confirmDelete) return;

    setDeleting(assignment.assignmentId);
    
    try {
      // console.log('🗑️ Deleting assignment:', assignment.assignmentId);
      
      const response = await fetch(`/api/assignments`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: assignment.userId,
          assignmentId: assignment.assignmentId,
          assignmentOwnerId: assignment.assignmentOwnerId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // console.log('✅ Assignment deleted successfully:', result);
        
        setAssignments(prev => prev.filter(a => a.assignmentId !== assignment.assignmentId));
        setSelectedAssignments(prev => {
          const newSet = new Set(prev);
          newSet.delete(assignment.assignmentId);
          return newSet;
        });
        
        alert(`Assignment "${assignment.title}" deleted successfully!`);
      } else {
        const error = await response.json();
        // console.error('❌ Delete failed:', error);
        alert(`Failed to delete assignment: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      // console.error('❌ Error deleting assignment:', error);
      alert('Failed to delete assignment. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    const selectedCount = selectedAssignments.size;
    const confirmDelete = confirm(
      `Are you sure you want to delete ${selectedCount} assignment${selectedCount > 1 ? 's' : ''}?\n\nThis action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    const assignmentsToDelete = assignments.filter(a => selectedAssignments.has(a.assignmentId));
    
    try {
      await Promise.all(
        assignmentsToDelete.map(assignment => 
          fetch(`/api/assignments`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: assignment.userId,
              assignmentId: assignment.assignmentId,
              assignmentOwnerId: assignment.assignmentOwnerId
            }),
          })
        )
      );

      setAssignments(prev => prev.filter(a => !selectedAssignments.has(a.assignmentId)));
      setSelectedAssignments(new Set());
      setShowBulkActions(false);
      
      alert(`${selectedCount} assignment${selectedCount > 1 ? 's' : ''} deleted successfully!`);
    } catch (error) {
      // console.error('❌ Error in bulk delete:', error);
      alert('Some assignments may not have been deleted. Please refresh and try again.');
    }
  };

  const handleSelectAssignment = (assignmentId: string) => {
    const newSelection = new Set(selectedAssignments);
    if (newSelection.has(assignmentId)) {
      newSelection.delete(assignmentId);
    } else {
      newSelection.add(assignmentId);
    }
    setSelectedAssignments(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedAssignments.size === filteredAssignments.length) {
      setSelectedAssignments(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedAssignments(new Set(filteredAssignments.map(a => a.assignmentId)));
      setShowBulkActions(true);
    }
  };

  const fetchAnalyticsData = async () => {
    if (assignments.length === 0) return;
    
    setAnalyticsLoading(true);
    // console.log('📊 Fetching analytics data for assignments...');
    
    try {
      const gradesPromises = assignments.map(async (assignment) => {
        try {
          const response = await fetch(
            `/api/grades?assignmentId=${assignment.assignmentId}&action=get-all-grades-for-assignment`
          );
          
          if (response.ok) {
            const data = await response.json();
            // console.log(`📊 Grades for ${assignment.title}:`, data.grades?.length || 0);
            return data.grades || [];
          }
          return [];
        } catch (error) {
          // console.error(`❌ Error fetching grades for ${assignment.assignmentId}:`, error);
          return [];
        }
      });
      
      const allGradesArrays = await Promise.all(gradesPromises);
      const combinedGrades = allGradesArrays.flat();
      
      // console.log('📊 Total grades fetched:', combinedGrades.length);
      setAllGrades(combinedGrades);
    } catch (error) {
      // console.error('❌ Error fetching analytics data:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    // console.log('🔍 FRONTEND DEBUG: Starting to fetch assignments...');
    
    try {
      const url = `/api/assignments?userId=${userId}&requestingUserId=${userId}&userRole=teacher`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.assignments && Array.isArray(data.assignments)) {
          setAssignments(data.assignments);
          // console.log('✅ Assignments fetched:', data.assignments.length);
        } else {
          setAssignments([]);
        }
      } else {
        // console.error('❌ API response not ok:', response.status);
        setAssignments([]);
      }
    } catch (error) {
      // console.error('❌ Error fetching assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [userId]);

  useEffect(() => {
    if (assignments.length > 0) {
      fetchAnalyticsData();
    }
  }, [assignments]);

  const getTotalPoints = (questions: { [key: string]: any } | undefined | null): number => {
    if (!questions || typeof questions !== 'object') return 0;
    return Object.values(questions).reduce((total, question) => total + (question?.points || 0), 0);
  };

  const getAssignmentStats = (assignment: Assignment): AssignmentStats => {
    const totalPoints = getTotalPoints(assignment.questions);
    const difficultyLevel = totalPoints > 10 ? 'Hard' : totalPoints > 5 ? 'Medium' : 'Easy';
    
    const assignmentGrades = allGrades.filter(grade => grade.assignmentId === assignment.assignmentId);
    const responseCount = assignmentGrades.length;
    
    let averageScore = 0;
    if (responseCount > 0) {
      const totalPercentage = assignmentGrades.reduce((sum, grade) => sum + grade.percentage, 0);
      averageScore = Math.round(totalPercentage / responseCount);
    }
    
    let lastActivity = assignment.createdAt;
    if (assignmentGrades.length > 0) {
      const mostRecentSubmission = assignmentGrades
        .map(grade => new Date(grade.submittedAt))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      lastActivity = mostRecentSubmission.toISOString();
    }
    
    const completionRate = responseCount > 0 ? 100 : 0;
    
    // console.log(`📊 Stats for ${assignment.title}:`, {
    //   responseCount,
    //   averageScore,
    //   completionRate,
    //   lastActivity: new Date(lastActivity).toLocaleDateString()
    // });
    
    return {
      responseCount,
      averageScore,
      completionRate,
      lastActivity,
      difficultyLevel
    };
  };

  const isWithinLastWeek = (dateString: string): boolean => {
    const date = new Date(dateString);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date > weekAgo;
  };

  const filteredAssignments = useMemo(() => {
    return assignments
      .filter(assignment => {
        const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterBy === 'all' || 
          (filterBy === 'graded' && assignment.isGradedForPoints) ||
          (filterBy === 'practice' && !assignment.isGradedForPoints) ||
          (filterBy === 'recent' && isWithinLastWeek(assignment.createdAt));
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        switch(sortBy) {
          case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'title': return a.title.localeCompare(b.title);
          case 'questions': return b.totalQuestions - a.totalQuestions;
          case 'responses': {
            const aStats = getAssignmentStats(a);
            const bStats = getAssignmentStats(b);
            return bStats.responseCount - aStats.responseCount;
          }
          default: return 0;
        }
      });
  }, [assignments, searchTerm, filterBy, sortBy, allGrades]);

  const dashboardStats = useMemo(() => {
    const total = assignments.length;
    const graded = assignments.filter(a => a.isGradedForPoints).length;
    const practice = total - graded;
    const thisWeek = assignments.filter(a => isWithinLastWeek(a.createdAt)).length;
    const totalResponses = allGrades.length;
    const avgScore = allGrades.length > 0 
      ? Math.round(allGrades.reduce((sum, grade) => sum + grade.percentage, 0) / allGrades.length)
      : 0;

    // console.log('📊 Dashboard stats:', {
    //   total,
    //   graded,
    //   practice,
    //   thisWeek,
    //   totalResponses,
    //   avgScore
    // });

    return { total, graded, practice, thisWeek, totalResponses, avgScore };
  }, [assignments, allGrades]);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-teal-800">Assignment Manager</h1>
            <p className="text-xs text-gray-600 mt-1">
              Manage, analyze, and organize your assignments
              {analyticsLoading && <span className="ml-2 text-blue-600">📊 Loading analytics...</span>}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-blue-600">{dashboardStats.total}</div>
            <div className="text-xs text-blue-800">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-green-600">{dashboardStats.graded}</div>
            <div className="text-xs text-green-800">Graded</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-orange-600">{dashboardStats.practice}</div>
            <div className="text-xs text-orange-800">Practice</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-purple-600">{dashboardStats.thisWeek}</div>
            <div className="text-xs text-purple-800">This Week</div>
          </div>
          <div className="bg-teal-50 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-teal-600">
              {analyticsLoading ? '...' : dashboardStats.totalResponses}
            </div>
            <div className="text-xs text-teal-800">Responses</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-2 text-center">
            <div className="text-xl font-bold text-indigo-600">
              {analyticsLoading ? '...' : dashboardStats.avgScore}%
            </div>
            <div className="text-xs text-indigo-800">Avg Score</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 font-medium focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Assignments</option>
              <option value="graded">Graded Only</option>
              <option value="practice">Practice Only</option>
              <option value="recent">Recent (7 days)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 font-medium focus:ring-2 focus:ring-teal-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Alphabetical</option>
              <option value="questions">Most Questions</option>
              <option value="responses">Most Responses</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {showBulkActions && (
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm text-gray-600">{selectedAssignments.size} selected</span>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Delete Selected
                </button>
              </div>
            )}

            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-900 font-medium border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {selectedAssignments.size === filteredAssignments.length && filteredAssignments.length > 0 ? 
                <CheckSquare className="h-4 w-4 text-gray-900" /> : <Square className="h-4 w-4 text-gray-900" />
              }
              Select All
            </button>

            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-teal-100 text-teal-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-teal-100 text-teal-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex-shrink-0 px-6 py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-sm text-gray-600">
          Showing {filteredAssignments.length} of {assignments.length} assignments
          {searchTerm && <span> matching "{searchTerm}"</span>}
          {filterBy !== 'all' && <span> • Filter: {filterBy}</span>}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading assignments...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            {assignments.length === 0 ? (
              <>
                <p className="text-gray-600 mb-4">No assignments found.</p>
                <button
                  onClick={handleClose}
                  className="bg-teal-600 text-white px-6 py-3 rounded-md hover:bg-teal-700"
                >
                  Create Your First Assignment
                </button>
              </>
            ) : (
              <p className="text-gray-600">No assignments match your current filters.</p>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-4'
          }>
            {filteredAssignments.map((assignment) => {
              const stats = getAssignmentStats(assignment);
              const isSelected = selectedAssignments.has(assignment.assignmentId);
              
              return (
                <div
                  key={assignment.assignmentId}
                  className={`bg-white border rounded-lg hover:shadow-lg transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-teal-500 border-teal-300' : 'border-gray-200'
                  } ${viewMode === 'list' ? 'p-5' : 'p-5'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSelectAssignment(assignment.assignmentId)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isSelected ? <CheckSquare className="h-5 w-5 text-teal-600" /> : <Square className="h-5 w-5" />}
                      </button>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 truncate" title={assignment.title}>
                          {assignment.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{assignment.totalQuestions} questions</span>
                      <span>{getTotalPoints(assignment.questions)} pts</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        assignment.isGradedForPoints 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {assignment.isGradedForPoints ? '📊 Graded' : '✅ Practice'}
                      </span>
                      
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        assignment.showCorrectAnswers 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {assignment.showCorrectAnswers ? '👁️ Shows Answers' : '🔒 Hides Answers'}
                      </span>
                      
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stats.difficultyLevel === 'Easy' ? 'bg-green-100 text-green-800' :
                        stats.difficultyLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {stats.difficultyLevel}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-500">
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {analyticsLoading ? '...' : stats.responseCount}
                      </div>
                      <div>Responses</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {analyticsLoading ? '...' : stats.averageScore}%
                      </div>
                      <div>Avg Score</div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-4">
                    <div>Created: {new Date(assignment.createdAt).toLocaleDateString()}</div>
                    <div>Last activity: {formatTimeAgo(stats.lastActivity)}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      onClick={() => handleEditAssignment(assignment)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title="Edit Assignment"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleViewStudentResults(assignment)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      title="View Results"
                    >
                      <BarChart3 className="h-3 w-3" />
                      Results
                    </button>
                    <button
                      onClick={() => handleDuplicateAssignment(assignment)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(assignment)}
                      disabled={deleting === assignment.assignmentId}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                        deleting === assignment.assignmentId
                          ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                      {deleting === assignment.assignmentId ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};