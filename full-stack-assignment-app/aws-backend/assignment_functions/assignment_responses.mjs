import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
        'Content-Type': 'application/json'
    };
    
    try {
        console.log('Event received:', JSON.stringify(event, null, 2));
        
        // Handle CORS preflight OPTIONS request
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'CORS preflight successful' })
            };
        }
        
        const tableName = process.env.DYNAMODB_TABLE_NAME || 'AssignmentsTable';
        
        if (event.httpMethod === 'POST') {
            // Submit assignment response
            return await submitResponse(event, tableName, corsHeaders);
        } else if (event.httpMethod === 'GET') {
            // Get assignment response or check permissions
            return await getResponse(event, tableName, corsHeaders);
        } else {
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }
        
    } catch (error) {
        console.error('Error in assignment responses handler:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

async function submitResponse(event, tableName, corsHeaders) {
    if (!event.body) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Request body is required' })
        };
    }
    
    let body;
    try {
        body = JSON.parse(event.body);
    } catch (parseError) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
    }
    
    // UPDATED: Validate required fields per boss requirements
    const { userId, assignmentId, assignmentOwnerId, userAssignmentResponse } = body;
    if (!userId || !assignmentId || !assignmentOwnerId || !userAssignmentResponse) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Missing required fields: userId, assignmentId, assignmentOwnerId, userAssignmentResponse' 
            })
        };
    }
    
    // UPDATED: Create response item per boss requirements
    const responseItem = {
        userId: userId,                           // PARTITION KEY - same as table structure
        assignmentId: assignmentId,               // SORT KEY - same as table structure
        assignmentOwnerId: assignmentOwnerId,     // ADDED: determines who can view vs edit
        userAssignmentResponse: userAssignmentResponse, // ADDED: array containing selected options
        submittedAt: new Date().toISOString(),
        status: 'submitted',
        type: 'user-response'                     // To distinguish from assignments
    };
    
    console.log('Saving user response with userId:', userId, 'assignmentId:', assignmentId);
    
    // Save to DynamoDB
    const command = new PutCommand({
        TableName: tableName,
        Item: responseItem
    });
    
    await dynamodb.send(command);
    
    console.log('Assignment response saved successfully');
    
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            success: true,
            message: 'Assignment response submitted successfully',
            userId: userId,
            assignmentId: assignmentId,
            submittedAt: responseItem.submittedAt
        })
    };
}

async function getResponse(event, tableName, corsHeaders) {
    const queryParams = event.queryStringParameters || {};
    const { userId, assignmentId, assignmentOwnerId, action } = queryParams;
    
    if (action === 'check-permissions') {
        // Check if user can edit (if userId matches assignmentOwnerId)
        const canEdit = userId === assignmentOwnerId;
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                canEdit: canEdit,
                message: canEdit ? 
                    'User can edit responses' : 'User can only view responses'
            })
        };
    }

    if (action === 'get-all-responses' && assignmentId) {
        // Get all user responses for a specific assignment (for teachers)
        console.log('Getting all responses for assignment:', assignmentId);
        
        // Query all users who have responded to this assignment
        const command = new ScanCommand({
            TableName: tableName,
            FilterExpression: 'assignmentId = :assignmentId AND #type = :responseType',
            ExpressionAttributeNames: {
                '#type': 'type'
            },
            ExpressionAttributeValues: {
                ':assignmentId': assignmentId,
                ':responseType': 'user-response'
            }
        });
        
        const response = await dynamodb.send(command);
        const responses = response.Items || [];
        
        // Sort by submission time (newest first)
        responses.sort((a, b) => {
            const dateA = new Date(a.submittedAt || '');
            const dateB = new Date(b.submittedAt || '');
            return dateB.getTime() - dateA.getTime();
        });
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                responses: responses,
                count: responses.length
            })
        };
    }
    
    if (userId && assignmentId) {
        // Get specific user's response using the composite key
        const command = new GetCommand({
            TableName: tableName,
            Key: { 
                userId: userId,
                assignmentId: assignmentId 
            }
        });
        
        const response = await dynamodb.send(command);
        
        if (!response.Item) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Assignment response not found' 
                })
            };
        }
        
        // Check if this is a user response (not an assignment)
        if (response.Item.type !== 'user-response') {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    success: false,
                    error: 'No user response found for this assignment' 
                })
            };
        }
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                response: response.Item
            })
        };
    }
    
    // If no specific query, return error
    return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
            error: 'Missing query parameters: userId and assignmentId required' 
        })
    };
}