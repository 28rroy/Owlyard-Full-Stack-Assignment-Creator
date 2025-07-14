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
    
    const fullUrl = `${apiGatewayUrl}/get-assignments`;
    console.log('Making request to:', fullUrl);
    
    // Call your Lambda function to get assignments
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get the response text first to see raw response
    const responseText = await response.text();
    console.log('Raw response body:', responseText);

    // Try to parse as JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      return NextResponse.json(
        { 
          error: 'Invalid JSON response from server',
          details: responseText,
          status: response.status
        },
        { status: 500 }
      );
    }

    console.log('Parsed response:', result);

    if (!response.ok) {
      console.error('API response not ok:', {
        status: response.status,
        statusText: response.statusText,
        body: result
      });
      
      return NextResponse.json(
        { 
          error: 'Server error',
          details: result,
          status: response.status,
          statusText: response.statusText
        },
        { status: response.status }
      );
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error getting assignments:', error);
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        apiUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}