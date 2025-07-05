import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get your API Gateway URL from environment variables
    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    
    console.log('GET request - API Gateway URL:', apiGatewayUrl);

    if (!apiGatewayUrl || apiGatewayUrl === 'YOUR_API_GATEWAY_URL' || apiGatewayUrl.includes('your-api-id')) {
      return NextResponse.json(
        { 
          error: 'API Gateway URL not configured properly',
          details: `Current value: ${apiGatewayUrl}`
        },
        { status: 500 }
      );
    }
    
    // Call your Lambda function to get assignments
    const response = await fetch(`${apiGatewayUrl}/assignments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('GET Response status:', response.status);

    const result = await response.json();
    console.log('GET Response body:', result);

    if (!response.ok) {
      throw new Error(result.error || result.message || 'Failed to get assignments');
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error getting assignments:', error);
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        apiUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL
      },
      { status: 500 }
    );
  }
}