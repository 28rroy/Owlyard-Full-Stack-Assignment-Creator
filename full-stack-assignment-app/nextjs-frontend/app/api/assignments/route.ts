import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const assignmentData = await request.json();
    
    console.log('Received assignment data:', JSON.stringify(assignmentData, null, 2));
    
    // Validate the data
    if (!assignmentData.title || !assignmentData.questions) {
      return NextResponse.json(
        { error: 'Missing required fields: title and questions' },
        { status: 400 }
      );
    }

    // Get your API Gateway URL from environment variables
    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    
    console.log('Raw environment variable:', process.env.NEXT_PUBLIC_API_GATEWAY_URL);
    console.log('API Gateway URL:', apiGatewayUrl);

    // Check if environment variable is properly set
    if (!apiGatewayUrl || apiGatewayUrl === 'YOUR_API_GATEWAY_URL' || apiGatewayUrl.includes('your-api-id')) {
      console.error('Environment variable not properly set:', apiGatewayUrl);
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
    console.log('Full URL:', fullUrl);
    
    // Call your Lambda function via API Gateway
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignmentData),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    const result = await response.json();
    console.log('Response body:', result);

    if (!response.ok) {
      console.error('API response not ok:', result);
      throw new Error(result.error || result.message || `HTTP ${response.status}: Failed to save assignment`);
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error saving assignment:', error);
    
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