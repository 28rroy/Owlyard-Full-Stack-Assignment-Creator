// types/index.ts - Global type definitions with security in mind

// ⭐ Keep existing AssignmentQuestion interface for compatibility
export interface AssignmentQuestion {
  question: string;
  options: string[];
  correctOptions: number[]; // Keep this for existing components
  explanation: string;
  points: number;
}

// ⭐ NEW: Student-facing question (no correct answers) - for API responses
export interface StudentAssignmentQuestion {
  question: string;
  options: string[];
  explanation: string;
  points: number;
  // ⭐ correctOptions removed - students never see this in API responses
}

// ⭐ Keep existing Assignment interface for component compatibility
export interface Assignment {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  title: string;
  questions: { [key: string]: AssignmentQuestion }; // Keep existing for components
  createdAt: string;
  totalQuestions: number;
  status: string;
  type: string;
}

// ⭐ NEW: Clean assignment type for API responses (what students actually receive)
export interface CleanAssignment {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  title: string;
  questions: { [key: string]: StudentAssignmentQuestion }; // ⭐ Clean questions for API
  createdAt: string;
  totalQuestions: number;
  status: string;
  type: string;
  // ⭐ correctAnswers field removed - students never see this
}

// ⭐ NEW: Server-side assignment with separated correct answers
export interface ServerAssignment {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  title: string;
  questions: { [key: string]: StudentAssignmentQuestion }; // Clean questions
  correctAnswers: { [key: string]: { correctOptions: number[] } }; // ⭐ Secure storage
  createdAt: string;
  totalQuestions: number;
  status: string;
  type: string;
}

// ⭐ NEW: Updated assignment response with automatic grading
export interface AssignmentResponse {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  userAssignmentResponse: number[];
  score: number;           // ⭐ NEW: Automatically calculated score
  totalPoints: number;     // ⭐ NEW: Total possible points
  percentage: number;      // ⭐ NEW: Percentage score
  gradingDetails: Array<{  // ⭐ NEW: Detailed grading information
    questionKey: string;
    questionPoints: number;
    studentAnswer: number;
    correctOptions: number[];
    isCorrect: boolean;
    pointsEarned: number;
  }>;
  submittedAt: string;
  status: string;
  type: string;
}

// ⭐ NEW: Function to convert clean assignment to component assignment
export function cleanToComponentAssignment(cleanAssignment: CleanAssignment): Assignment {
  const componentQuestions: { [key: string]: AssignmentQuestion } = {};
  
  Object.entries(cleanAssignment.questions).forEach(([key, question]) => {
    componentQuestions[key] = {
      question: question.question,
      options: question.options,
      correctOptions: [], // Empty for students - components won't use this
      explanation: question.explanation,
      points: question.points
    };
  });
  
  return {
    ...cleanAssignment,
    questions: componentQuestions
  };
}

// ⭐ NEW: Security verification function
export function verifyStudentDataSecurity(assignment: any): boolean {
  // Check if assignment has populated correct answers (security breach for students)
  const hasCorrectAnswers = assignment.questions && 
    Object.values(assignment.questions).some((q: any) => 
      q.correctOptions !== undefined && Array.isArray(q.correctOptions) && q.correctOptions.length > 0
    );
  const hasCorrectAnswersField = assignment.correctAnswers !== undefined;
  
  if (hasCorrectAnswers || hasCorrectAnswersField) {
    console.error('🚨 SECURITY VIOLATION: Student received correct answers');
    return false;
  }
  
  return true;
}

// ⭐ NEW: API Response types with data type indicators
export interface AssignmentListResponse {
  success: boolean;
  assignments: Assignment[] | CleanAssignment[];
  count: number;
  dataType: 'complete' | 'student-safe'; // ⭐ Indicates data security level
  debug?: any;
}

export interface AssignmentDetailResponse {
  success: boolean;
  assignment: Assignment | CleanAssignment;
  dataType: 'complete' | 'student-safe'; // ⭐ Indicates data security level
}

export interface AssignmentSubmissionResponse {
  success: boolean;
  message: string;
  score: number;
  totalPoints: number;
  percentage: number;
  gradingSummary: string;
  submittedAt: string;
}

// ⭐ NEW: User context types
export interface UserContext {
  userId: string;
  isTeacher: boolean;
  assignmentOwnerId: string;
  userRole: 'teacher' | 'student';
}

// ⭐ NEW: Security configuration
export const SECURITY_CONFIG = {
  MAX_QUESTION_LENGTH: 1000,
  MAX_OPTION_LENGTH: 500,
  MAX_QUESTIONS: 100,
  REQUIRE_SECURITY_VERIFICATION: true,
  LOG_SECURITY_VIOLATIONS: true,
} as const;

// ⭐ NEW: Grading configuration
export const GRADING_CONFIG = {
  PASSING_PERCENTAGE: 70,
  GRADE_SCALE: {
    A: 90,
    B: 80,
    C: 70,
    D: 60,
    F: 0
  }
} as const;

// ⭐ NEW: Helper function to get letter grade
export function getLetterGrade(percentage: number): string {
  if (percentage >= GRADING_CONFIG.GRADE_SCALE.A) return 'A';
  if (percentage >= GRADING_CONFIG.GRADE_SCALE.B) return 'B';
  if (percentage >= GRADING_CONFIG.GRADE_SCALE.C) return 'C';
  if (percentage >= GRADING_CONFIG.GRADE_SCALE.D) return 'D';
  return 'F';
}

// ⭐ NEW: Helper function to determine if passing
export function isPassingGrade(percentage: number): boolean {
  return percentage >= GRADING_CONFIG.PASSING_PERCENTAGE;
}