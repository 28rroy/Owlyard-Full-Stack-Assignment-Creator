import { NextRequest, NextResponse } from 'next/server';

// Validation constants
const MAX_QUESTION_LENGTH = 1000;
const MAX_OPTION_LENGTH = 500;
const MAX_QUESTIONS = 100;

// Interface for assignment data
interface AssignmentQuestion {
  question: string;
  options: string[];
  correctOptions: number[];
  explanation: string;
  points: number;
}

interface AssignmentData {
  title: string;
  questions: { [key: string]: AssignmentQuestion };
  createdAt: string;
  metadata: any;
}

export async function POST(request: NextRequest) {
  try {
    const assignmentData: AssignmentData = await request.json();
    
    // console.log('Received assignment data:', JSON.stringify(assignmentData, null, 2));
    
    // Validate the data
    if (!assignmentData.title || !assignmentData.questions) {
      return NextResponse.json(
        { error: 'Missing required fields: title and questions' },
        { status: 400 }
      );
    }

    // Validate question limits
    const questionCount = Object.keys(assignmentData.questions).length;
    if (questionCount > MAX_QUESTIONS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_QUESTIONS} questions allowed. Received ${questionCount} questions.` },
        { status: 400 }
      );
    }

    // Validate question and option lengths
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
    
    // console.log('Raw environment variable:', process.env.NEXT_PUBLIC_API_GATEWAY_URL);
    // console.log('API Gateway URL:', apiGatewayUrl);

    // Check if environment variable is properly set
    if (!apiGatewayUrl || apiGatewayUrl === 'YOUR_API_GATEWAY_URL' || apiGatewayUrl.includes('your-api-id')) {
      // console.error('Environment variable not properly set:', apiGatewayUrl);
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
    // console.log('Full URL:', fullUrl);
    
    // Call your Lambda function via API Gateway
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignmentData),
    });

    // console.log('Response status:', response.status);
    // console.log('Response ok:', response.ok);

    const result = await response.json();
    // console.log('Response body:', result);

    if (!response.ok) {
      // console.error('API response not ok:', result);
      throw new Error(result.error || result.message || `HTTP ${response.status}: Failed to save assignment`);
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    // console.error('Error saving assignment:', error);
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorCause = error instanceof Error && error.cause ? String(error.cause) : 'No additional details';
    
    // Return detailed error information
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorCause,
        apiUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL
      },
      { status: 500 }
    );
  }
}