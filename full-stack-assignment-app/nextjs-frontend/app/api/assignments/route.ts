import { NextRequest, NextResponse } from 'next/server';

// Validation constants (must match backend)
const MAX_QUESTION_LENGTH = 1000;
const MAX_OPTION_LENGTH = 500;
const MAX_QUESTIONS = 100;

// ⭐ Add proper typing for the assignment data structure
interface QuestionData {
  question: string;
  options: string[];
  correctOptions: number[];
  explanation: string;
  points: number;
}

interface AssignmentData {
  title: string;
  questions: { [key: string]: QuestionData };
  userId: string;
  assignmentOwnerId: string;
  createdAt?: string;
  metadata?: any;
  assignmentId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const assignmentData: AssignmentData = await request.json();
    
    // Validate the assignment data
    if (!assignmentData.title || !assignmentData.questions || !assignmentData.userId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, questions, userId' },
        { status: 400 }
      );
    }

    // Validate question count
    const questionCount = Object.keys(assignmentData.questions).length;
    if (questionCount === 0 || questionCount > MAX_QUESTIONS) {
      return NextResponse.json(
        { error: `Invalid number of questions. Must be between 1 and ${MAX_QUESTIONS}. Received ${questionCount} questions.` },
        { status: 400 }
      );
    }

    // ⭐ UPDATED: Validate question and option lengths with proper typing
    for (const [questionKey, questionData] of Object.entries(assignmentData.questions)) {
      if (questionData.question && questionData.question.length > MAX_QUESTION_LENGTH) {
        return NextResponse.json(
          { error: `Question ${questionKey} exceeds maximum length of ${MAX_QUESTION_LENGTH} characters.` },
          { status: 400 }
        );
      }
      
      if (questionData.options && Array.isArray(questionData.options)) {
        for (let i = 0; i < questionData.options.length; i++) {
          if (questionData.options[i] && questionData.options[i].length > MAX_OPTION_LENGTH) {
            return NextResponse.json(
              { error: `Question ${questionKey}, Option ${i + 1} exceeds maximum length of ${MAX_OPTION_LENGTH} characters.` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Get your API Gateway URL from environment variables
    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    
    // Check if environment variable is properly set
    if (!apiGatewayUrl || apiGatewayUrl === 'YOUR_API_GATEWAY_URL' || apiGatewayUrl.includes('your-api-id')) {
      return NextResponse.json(
        { 
          error: 'API Gateway URL not configured properly',
          details: `Current value: ${apiGatewayUrl}`,
          fix: 'Please check your .env.local file'
        },
        { status: 500 }
      );
    }
    
    const fullUrl = `${apiGatewayUrl}/save-assignment`;
    
    // Call your Lambda function via API Gateway
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignmentData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.message || `HTTP ${response.status}: Failed to save assignment`);
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error saving assignment:', error);
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorCause = error instanceof Error && error.cause ? 
      ` Cause: ${JSON.stringify(error.cause)}` : '';
      
    return NextResponse.json(
      {
        error: 'Failed to save assignment',
        message: errorMessage + errorCause,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const requestingUserId = searchParams.get('requestingUserId');
    const userRole = searchParams.get('userRole');
    
    // Get your API Gateway URL from environment variables
    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    
    if (!apiGatewayUrl) {
      return NextResponse.json(
        { error: 'API Gateway URL not configured' },
        { status: 500 }
      );
    }
    
    // ⭐ NEW: Build URL with security parameters
    let fullUrl = `${apiGatewayUrl}/get-assignments`;
    const params = new URLSearchParams();
    
    if (userId) params.append('userId', userId);
    if (requestingUserId) params.append('requestingUserId', requestingUserId);
    if (userRole) params.append('userRole', userRole);
    
    if (params.toString()) {
      fullUrl += `?${params.toString()}`;
    }
    
    console.log('Fetching assignments from:', fullUrl);
    
    // Call your Lambda function via API Gateway
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.message || `HTTP ${response.status}: Failed to get assignments`);
    }

    // ⭐ NEW: Log security verification
    if (result.dataType === 'student-safe') {
      console.log('✅ Returning student-safe data (no correct answers)');
    } else if (result.dataType === 'complete') {
      console.log('✅ Returning complete data for teacher/grading');
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error getting assignments:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      {
        error: 'Failed to get assignments',
        message: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}