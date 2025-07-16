import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
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
    
    // Validate required fields
    const { studentId, assignmentId, assignmentOwnerId, responses } = body;
    if (!studentId || !assignmentId || !assignmentOwnerId || !responses) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Missing required fields: studentId, assignmentId, assignmentOwnerId, responses' 
            })
        };
    }
    
    // Create response item
    const responseItem = {
        responseId: `student#${studentId}#assignment#${assignmentId}`, // Primary key
        studentId: studentId,
        assignmentId: assignmentId,
        assignmentOwnerId: assignmentOwnerId,
        responses: responses, // Vector of student's chosen options
        submittedAt: new Date().toISOString(),
        status: 'submitted',
        type: 'assignment-response'
    };
    
    // Save to DynamoDB
    const command = new PutCommand({
        TableName: tableName,
        Item: responseItem
    });
    
    await dynamodb.send(command);
    
    console.log('Assignment response saved:', responseItem.responseId);
    
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            success: true,
            message: 'Assignment response submitted successfully',
            responseId: responseItem.responseId,
            submittedAt: responseItem.submittedAt
        })
    };
}

async function getResponse(event, tableName, corsHeaders) {
    const queryParams = event.queryStringParameters || {};
    const { studentId, assignmentId, assignmentOwnerId, action } = queryParams;
    
    if (action === 'check-permissions') {
        // Check if student can edit (if studentId matches assignmentOwnerId)
        const canEdit = studentId === assignmentOwnerId;
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                canEdit: canEdit,
                message: canEdit ? 'User can edit responses' : 'User can only view responses'
            })
        };
    }

    if (action === 'get-all-responses' && assignmentId) {
        // Get all student responses for a specific assignment (for teachers)
        console.log('Getting all responses for assignment:', assignmentId);
        
        const command = new ScanCommand({
            TableName: tableName,
            FilterExpression: 'assignmentId = :assignmentId AND #type = :responseType',
            ExpressionAttributeNames: {
                '#type': 'type'
            },
            ExpressionAttributeValues: {
                ':assignmentId': assignmentId,
                ':responseType': 'assignment-response'
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
    
    if (studentId && assignmentId) {
        // Get specific student's response
        const responseId = `student#${studentId}#assignment#${assignmentId}`;
        
        const command = new GetCommand({
            TableName: tableName,
            Key: { responseId: responseId }
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
            error: 'Missing query parameters: studentId and assignmentId required' 
        })
    };
}