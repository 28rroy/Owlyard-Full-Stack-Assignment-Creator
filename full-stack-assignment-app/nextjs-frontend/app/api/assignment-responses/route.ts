import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get your API Gateway URL from environment variables
    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    
    if (!apiGatewayUrl || apiGatewayUrl === 'YOUR_API_GATEWAY_URL' || apiGatewayUrl.includes('your-api-id')) {
      return NextResponse.json(
        { 
          error: 'API Gateway URL not configured properly',
          details: `Current value: ${apiGatewayUrl}`
        },
        { status: 500 }
      );
    }
    
    const fullUrl = `${apiGatewayUrl}/assignment-responses`;
    
    // Call your Lambda function via API Gateway
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.message || `HTTP ${response.status}: Failed to submit response`);
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error submitting assignment response:', error);
    
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

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Get your API Gateway URL from environment variables
    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    
    if (!apiGatewayUrl || apiGatewayUrl === 'YOUR_API_GATEWAY_URL' || apiGatewayUrl.includes('your-api-id')) {
      return NextResponse.json(
        { 
          error: 'API Gateway URL not configured properly',
          details: `Current value: ${apiGatewayUrl}`
        },
        { status: 500 }
      );
    }
    
    const fullUrl = `${apiGatewayUrl}/assignment-responses?${queryString}`;
    
    // Call your Lambda function via API Gateway
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || result.message || `HTTP ${response.status}: Failed to get response`);
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error getting assignment response:', error);
    
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