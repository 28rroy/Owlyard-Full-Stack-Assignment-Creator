import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
        
        // Only allow GET requests (OPTIONS handled above)
        if (event.httpMethod !== 'GET') {
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Method not allowed. Use GET.' })
            };
        }
        
        // Get DynamoDB table name from environment variable
        const tableName = process.env.DYNAMODB_TABLE_NAME || 'AssignmentsTable';
        console.log('Using table:', tableName);
        
        // UPDATED: Check query parameters for userId and specific assignmentId
        const queryParams = event.queryStringParameters || {};
        const { userId, assignmentId } = queryParams;
        
        if (userId && assignmentId) {
            // Get specific assignment for specific user
            console.log('Getting specific assignment:', assignmentId, 'for user:', userId);
            const command = new GetCommand({
                TableName: tableName,
                Key: { 
                    userId: userId,
                    assignmentId: assignmentId 
                }
            });
            
            const response = await dynamodb.send(command);
            
            if (!response.Item || response.Item.type !== 'assignment') {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Assignment not found' })
                };
            }
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    assignment: response.Item
                })
            };
        } 
        else if (userId) {
            // Get all assignments for a specific user
            console.log('Getting all assignments for user:', userId);
            const command = new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: 'userId = :userId',
                FilterExpression: '#type = :assignmentType',
                ExpressionAttributeNames: {
                    '#type': 'type'
                },
                ExpressionAttributeValues: {
                    ':userId': userId,
                    ':assignmentType': 'assignment'
                }
            });
            
            const response = await dynamodb.send(command);
            const assignments = response.Items || [];
            
            // Sort by creation date (newest first)
            assignments.sort((a, b) => {
                const dateA = new Date(a.createdAt || '');
                const dateB = new Date(b.createdAt || '');
                return dateB.getTime() - dateA.getTime();
            });
            
            console.log(`Found ${assignments.length} assignments for user ${userId}`);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    assignments: assignments,
                    count: assignments.length
                })
            };
        }
        else {
            // Get all assignments across all users (for admin view)
            console.log('Getting all assignments from table (admin view)');
            const command = new ScanCommand({
                TableName: tableName,
                FilterExpression: '#type = :assignmentType',
                ExpressionAttributeNames: {
                    '#type': 'type'
                },
                ExpressionAttributeValues: {
                    ':assignmentType': 'assignment'
                }
            });
            
            const response = await dynamodb.send(command);
            const assignments = response.Items || [];
            
            // Sort by creation date (newest first)
            assignments.sort((a, b) => {
                const dateA = new Date(a.createdAt || '');
                const dateB = new Date(b.createdAt || '');
                return dateB.getTime() - dateA.getTime();
            });
            
            console.log(`Found ${assignments.length} assignments across all users`);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    assignments: assignments,
                    count: assignments.length,
                    debug: {
                        message: 'Returned all assignments across all users',
                        timestamp: new Date().toISOString()
                    }
                })
            };
        }
        
    } catch (error) {
        // Enhanced error logging
        console.error('💥 ERROR in get_assignments:', error);
        console.error('💥 Error message:', error.message);
        console.error('💥 Error stack:', error.stack);
        console.error('💥 Event that caused error:', JSON.stringify(event));
        
        // Return error response
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message,
                details: error.stack,
                timestamp: new Date().toISOString()
            })
        };
    }
};