import { NextRequest, NextResponse } from 'next/server';

const GRADES_API_BASE = process.env.GRADES_API_BASE || 'https://your-api-gateway-url.amazonaws.com/Prod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Forward all query parameters to the backend
    const queryString = searchParams.toString();
    const backendUrl = `${GRADES_API_BASE}/read-grades${queryString ? `?${queryString}` : ''}`;
    
    console.log('🔍 Forwarding grades request to:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('❌ Backend grades request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to fetch grades from backend' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Grades fetched successfully from backend');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Error in grades API route:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching grades' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const backendUrl = `${GRADES_API_BASE}/save-grades`;
    
    console.log('🔍 Forwarding save grades request to:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      console.error('❌ Backend save grades request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to save grades to backend' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Grades saved successfully to backend');
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Error in save grades API route:', error);
    return NextResponse.json(
      { error: 'Internal server error while saving grades' },
      { status: 500 }
    );
  }
}