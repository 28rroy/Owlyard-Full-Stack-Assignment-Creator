import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const apiUrlEndpoint = '/create-group-api';

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.idToken;

    // Get CSRF token from request header
    const csrfToken = request.headers.get('X-CSRF-Token');
  
    // Validate CSRF token (must match the one in session)
    if (!csrfToken || csrfToken !== session?.csrfToken) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
 

    // Get the URL and extract the groupName and groupId parameters
    const url = new URL(request.url);
    const groupName = url.searchParams.get('groupName');
    const groupId = url.searchParams.get('groupId');
    const groupOwnerName = session?.user?.name;
    
    // Validate required parameters
    if (!groupName || !groupId) {
      return NextResponse.json(
        { error: 'Missing required parameters: groupName and groupId' },
        { status: 400 }
      );
    }

    // Build the API URL with the required parameters
    const apiUrl = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}${apiUrlEndpoint}`);
    apiUrl.searchParams.append('groupName', groupName);
    apiUrl.searchParams.append('groupId', groupId);
    apiUrl.searchParams.append('groupOwnerName', groupOwnerName || '');

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    console.error('Error in proxy route:', error);
    
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
