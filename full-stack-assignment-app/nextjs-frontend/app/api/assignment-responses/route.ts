import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('POST assignment-responses - Request body:', body);

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
    console.log('Making POST request to:', fullUrl);
    
    // Call your Lambda function to submit assignment response
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Response status:', response.status);

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
    console.error('Error submitting assignment response:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const assignmentId = searchParams.get('assignmentId');
    const assignmentOwnerId = searchParams.get('assignmentOwnerId');
    const action = searchParams.get('action');
    
    console.log('GET assignment-responses - Query params:', {
      userId,
      assignmentId,
      assignmentOwnerId,
      action
    });

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
    
    // Build query string
    const queryParams = new URLSearchParams();
    if (userId) queryParams.append('userId', userId);
    if (assignmentId) queryParams.append('assignmentId', assignmentId);
    if (assignmentOwnerId) queryParams.append('assignmentOwnerId', assignmentOwnerId);
    if (action) queryParams.append('action', action);
    
    const fullUrl = `${apiGatewayUrl}/assignment-responses?${queryParams.toString()}`;
    console.log('Making GET request to:', fullUrl);
    
    // Call your Lambda function to get assignment responses
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);

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
    console.error('Error getting assignment responses:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}