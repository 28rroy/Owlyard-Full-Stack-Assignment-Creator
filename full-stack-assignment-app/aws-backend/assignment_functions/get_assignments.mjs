import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

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
        
        // Check if specific assignment ID is requested
        let assignmentId = null;
        if (event.pathParameters && event.pathParameters.assignmentId) {
            assignmentId = event.pathParameters.assignmentId;
        }
        
        if (assignmentId) {
            // Get specific assignment
            console.log('Getting specific assignment:', assignmentId);
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
            // Get all assignments - IMPROVED FILTERING
            console.log('Getting all assignments from table:', tableName);
            const command = new ScanCommand({
                TableName: tableName
            });
            
            const response = await dynamodb.send(command);
            const allItems = response.Items || [];
            
            console.log('Found total items before filtering:', allItems.length);
            
            // Filter to get only actual assignments (exclude student responses)
            const assignments = allItems.filter(item => {
                // Student responses have responseId in format: student#ID#assignment#ID
                if (item.responseId) {
                    console.log('Filtering out student response:', item.responseId);
                    return false;
                }
                
                // Student responses have type = 'assignment-response'
                if (item.type === 'assignment-response') {
                    console.log('Filtering out response by type:', item.type);
                    return false;
                }
                
                // Items with assignmentId and title are likely assignments
                if (item.assignmentId && item.title) {
                    console.log('Keeping assignment:', item.assignmentId, item.title);
                    return true;
                }
                
                // Log items that don't match any criteria for debugging
                console.log('Unknown item type:', {
                    keys: Object.keys(item),
                    hasAssignmentId: !!item.assignmentId,
                    hasResponseId: !!item.responseId,
                    hasTitle: !!item.title,
                    type: item.type
                });
                
                return false;
            });
            
            console.log('Found actual assignments after filtering:', assignments.length);
            
            // Sort by creation date (newest first)
            assignments.sort((a, b) => {
                const dateA = new Date(a.createdAt || '');
                const dateB = new Date(b.createdAt || '');
                return dateB.getTime() - dateA.getTime();
            });
            
            // Log assignment titles for debugging
            console.log('Assignment titles:', assignments.map(a => a.title));
            
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
        // Log the error for debugging
        console.error('Error retrieving assignments:', error);
        console.error('Event:', JSON.stringify(event));
        console.error('Error stack:', error.stack);
        
        // Return error response
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message,
                details: error.stack
            })
        };
    }
};