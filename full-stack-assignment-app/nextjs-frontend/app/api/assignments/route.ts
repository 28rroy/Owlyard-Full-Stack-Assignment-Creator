// nextjs-frontend/app/api/assignments/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const assignmentId = searchParams.get('assignmentId');
    const requestingUserId = searchParams.get('requestingUserId');
    const userRole = searchParams.get('userRole');
    
    console.log('GET /api/assignments - Parameters:', { 
      userId, 
      assignmentId, 
      requestingUserId, 
      userRole 
    });

    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    
    if (!apiGatewayUrl || apiGatewayUrl === 'YOUR_API_GATEWAY_URL') {
      return NextResponse.json(
        { 
          error: 'API Gateway URL not configured properly',
          details: `Current value: ${apiGatewayUrl}`
        },
        { status: 500 }
      );
    }
    
    // ⭐ UPDATED: Build URL with all parameters including new settings support
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (assignmentId) params.append('assignmentId', assignmentId);
    if (requestingUserId) params.append('requestingUserId', requestingUserId);
    if (userRole) params.append('userRole', userRole);
    
    const fullUrl = `${apiGatewayUrl}/get-assignments?${params.toString()}`;
    console.log('Making request to:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('Raw response:', responseText);

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
          status: response.status
        },
        { status: response.status }
      );
    }

    // ⭐ UPDATED: Log assignment settings for debugging
    if (result.assignment) {
      console.log('Single assignment settings:', {
        title: result.assignment.title,
        showCorrectAnswers: result.assignment.showCorrectAnswers,
        isGradedForPoints: result.assignment.isGradedForPoints
      });
    }
    
    if (result.assignments) {
      console.log(`Retrieved ${result.assignments.length} assignments with settings`);
      result.assignments.forEach((assignment: any) => {
        console.log(`${assignment.title}: showCorrectAnswers=${assignment.showCorrectAnswers}, isGradedForPoints=${assignment.isGradedForPoints}`);
      });
    }

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error getting assignments:', error);
    
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('POST /api/assignments - Body received:', {
      title: body.title,
      userId: body.userId,
      assignmentOwnerId: body.assignmentOwnerId,
      totalQuestions: body.metadata?.totalQuestions,
      // ⭐ NEW: Log new settings
      showCorrectAnswers: body.showCorrectAnswers,
      isGradedForPoints: body.isGradedForPoints,
      assignmentId: body.assignmentId ? '(editing)' : '(new)'
    });

    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    
    if (!apiGatewayUrl || apiGatewayUrl === 'YOUR_API_GATEWAY_URL') {
      return NextResponse.json(
        { 
          error: 'API Gateway URL not configured properly',
          details: `Current value: ${apiGatewayUrl}`
        },
        { status: 500 }
      );
    }
    
    const fullUrl = `${apiGatewayUrl}/save-assignment`;
    console.log('Making POST request to:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('POST response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse POST response as JSON:', parseError);
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
      console.error('POST API response not ok:', {
        status: response.status,
        statusText: response.statusText,
        body: result
      });
      
      return NextResponse.json(
        { 
          error: 'Server error',
          details: result,
          status: response.status
        },
        { status: response.status }
      );
    }

    // ⭐ UPDATED: Log successful save with new settings
    console.log('Assignment saved successfully:', {
      assignmentId: result.assignmentId,
      title: result.title,
      showCorrectAnswers: result.showCorrectAnswers,
      isGradedForPoints: result.isGradedForPoints
    });

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error saving assignment:', error);
    
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

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    console.log('DELETE /api/assignments - Body received:', {
      userId: body.userId,
      assignmentId: body.assignmentId,
      assignmentOwnerId: body.assignmentOwnerId
    });

    const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    
    if (!apiGatewayUrl || apiGatewayUrl === 'YOUR_API_GATEWAY_URL') {
      return NextResponse.json(
        { 
          error: 'API Gateway URL not configured properly',
          details: `Current value: ${apiGatewayUrl}`
        },
        { status: 500 }
      );
    }
    
    const fullUrl = `${apiGatewayUrl}/delete-assignment`;
    console.log('Making DELETE request to:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log('DELETE response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse DELETE response as JSON:', parseError);
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
      console.error('DELETE API response not ok:', {
        status: response.status,
        statusText: response.statusText,
        body: result
      });
      
      return NextResponse.json(
        { 
          error: 'Server error',
          details: result,
          status: response.status
        },
        { status: response.status }
      );
    }

    console.log('Assignment deleted successfully:', {
      assignmentId: result.deletedAssignment?.assignmentId,
      title: result.deletedAssignment?.title,
      deletedResponsesCount: result.deletedResponsesCount
    });

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error('Error deleting assignment:', error);
    
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