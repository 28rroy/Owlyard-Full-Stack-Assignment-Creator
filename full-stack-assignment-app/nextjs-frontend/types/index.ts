// types/index.ts - Updated with multiple choice support

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
  correctAnswers: { [key: string]: { correctOptions: number[], questionType: string } };
  createdAt: string;
  totalQuestions: number;
  status: string;
  type: string;
  // ⭐ NEW: Settings
  showCorrectAnswers?: boolean;
  isGradedForPoints?: boolean;
}

// ✅ UPDATED: Assignment response interface with multiple choice support
export interface AssignmentResponse {
  userId: string;
  assignmentId: string;
  assignmentOwnerId: string;
  // ✅ FIXED: Support both single numbers and arrays for mixed response types
  userAssignmentResponse: (number | number[])[];
  score: number;
  totalPoints: number;
  percentage: number;
  gradingDetails: Array<{
    questionKey: string;
    questionPoints: number;
    // ✅ FIXED: Support both single and multiple selections
    studentAnswer: number | number[];
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

// ✅ NEW: Helper function to determine if question is multiple choice
export function isMultipleChoiceQuestion(correctOptions: number[]): boolean {
  return Array.isArray(correctOptions) && correctOptions.length > 1;
}

// ✅ NEW: Helper function to format student answer display
export function formatStudentAnswer(
  studentAnswer: number | number[], 
  options: string[], 
  isMultipleChoice: boolean
): string {
  if (Array.isArray(studentAnswer)) {
    // Multiple selections
    return studentAnswer.length > 0 ? 
      studentAnswer.map(answerIndex => options[answerIndex] || `Option ${answerIndex + 1}`).join(', ') : 
      'No selection';
  } else {
    // Single selection
    return studentAnswer !== undefined && studentAnswer !== -1 
      ? options[studentAnswer] || `Option ${studentAnswer + 1}`
      : 'No answer';
  }
}

// ✅ NEW: Helper function to calculate score for single question (matches backend logic)
export function calculateQuestionScore(
  studentAnswer: number | number[],
  correctOptions: number[],
  questionPoints: number
): { isCorrect: boolean; pointsEarned: number } {
  if (!correctOptions || !Array.isArray(correctOptions)) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  if (correctOptions.length === 1) {
    // Single choice question
    const studentChoice = Array.isArray(studentAnswer) ? studentAnswer[0] : studentAnswer;
    const isCorrect = studentChoice === correctOptions[0];
    return {
      isCorrect,
      pointsEarned: isCorrect ? questionPoints : 0
    };
  } else {
    // Multiple choice question - match backend logic
    const studentSelections = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
    
    // Student must select ALL correct answers and NO incorrect ones
    const hasAllCorrect = correctOptions.every(correctOption => 
      studentSelections.includes(correctOption)
    );
    const hasNoIncorrect = studentSelections.every(studentOption => 
      correctOptions.includes(studentOption)
    );
    
    const isCorrect = hasAllCorrect && hasNoIncorrect && studentSelections.length === correctOptions.length;
    
    return {
      isCorrect,
      pointsEarned: isCorrect ? questionPoints : 0
    };
  }
}