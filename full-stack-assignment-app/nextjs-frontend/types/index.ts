// types/index.ts - Updated with new assignment settings

// ⭐ Updated AssignmentQuestion interface
export interface AssignmentQuestion {
  question: string;
  options: string[];
  correctOptions: number[];
  explanation: string;
  points: number;
}

// ⭐ Updated Assignment interface with new settings
export interface Assignment {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  title: string;
  questions: { [key: string]: AssignmentQuestion };
  createdAt: string;
  totalQuestions: number;
  status: string;
  type: string;
  // ⭐ NEW: Assignment settings
  showCorrectAnswers?: boolean;  // Default: true
  isGradedForPoints?: boolean;   // Default: true
}

// ⭐ Student-facing question (no correct answers)
export interface StudentAssignmentQuestion {
  question: string;
  options: string[];
  explanation: string;
  points: number;
}

// ⭐ Clean assignment type for API responses (what students receive)
export interface CleanAssignment {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  title: string;
  questions: { [key: string]: StudentAssignmentQuestion };
  createdAt: string;
  totalQuestions: number;
  status: string;
  type: string;
  // ⭐ NEW: Settings still passed to student (they need to know display rules)
  showCorrectAnswers?: boolean;
  isGradedForPoints?: boolean;
}

// ⭐ Server-side assignment with separated correct answers
export interface ServerAssignment {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  title: string;
  questions: { [key: string]: StudentAssignmentQuestion };
  correctAnswers: { [key: string]: { correctOptions: number[] } };
  createdAt: string;
  totalQuestions: number;
  status: string;
  type: string;
  // ⭐ NEW: Settings
  showCorrectAnswers?: boolean;
  isGradedForPoints?: boolean;
}

// ⭐ Updated assignment response interface
export interface AssignmentResponse {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  userAssignmentResponse: number[];
  score: number;
  totalPoints: number;
  percentage: number;
  gradingDetails: Array<{
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

// ⭐ Security verification function
export function verifyStudentDataSecurity(assignment: Assignment | CleanAssignment): boolean {
  // Check if assignment has correct answers in questions (it shouldn't for students)
  const questions = Object.values(assignment.questions);
  for (const question of questions) {
    // Check if correctOptions exists and has actual values
    if ('correctOptions' in question) {
      const correctOptions = (question as any).correctOptions;
      if (correctOptions && Array.isArray(correctOptions) && correctOptions.length > 0) {
        console.error('Security violation: Student data contains correct answers');
        return false;
      }
    }
  }
  console.log('✅ Student data security verified - no correct answers found');
  return true;
}

// ⭐ Function to convert clean assignment to component assignment
export function cleanToComponentAssignment(cleanAssignment: CleanAssignment): Assignment {
  const componentQuestions: { [key: string]: AssignmentQuestion } = {};
  
  Object.entries(cleanAssignment.questions).forEach(([key, question]) => {
    componentQuestions[key] = {
      ...question,
      correctOptions: [] // Empty for students
    };
  });
  
  return {
    ...cleanAssignment,
    questions: componentQuestions
  };
}