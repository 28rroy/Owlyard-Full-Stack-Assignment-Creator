import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };
    
    try {
        // Only allow GET requests
        if (event.httpMethod !== 'GET') {
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Method not allowed. Use GET.' })
            };
        }
        
        // Get DynamoDB table name from environment variable
        const tableName = process.env.DYNAMODB_TABLE_NAME || 'AssignmentsTable';
        
        // Check if specific assignment ID is requested
        let assignmentId = null;
        if (event.pathParameters && event.pathParameters.assignmentId) {
            assignmentId = event.pathParameters.assignmentId;
        }
        
        if (assignmentId) {
            // Get specific assignment
            const command = new GetCommand({
                TableName: tableName,
                Key: { assignmentId: assignmentId }
            });
            
            const response = await dynamodb.send(command);
            
            if (!response.Item) {
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
        } else {
            // Get all assignments (scan - use with caution in production)
            const command = new ScanCommand({
                TableName: tableName
            });
            
            const response = await dynamodb.send(command);
            const assignments = response.Items || [];
            
            // Sort by creation date (newest first)
            assignments.sort((a, b) => {
                const dateA = new Date(a.createdAt || '');
                const dateB = new Date(b.createdAt || '');
                return dateB.getTime() - dateA.getTime();
            });
            
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
        
    } catch (error) {
        // Log the error
        console.error('Error retrieving assignments:', error);
        console.error('Event:', JSON.stringify(event));
        
        // Return error response
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