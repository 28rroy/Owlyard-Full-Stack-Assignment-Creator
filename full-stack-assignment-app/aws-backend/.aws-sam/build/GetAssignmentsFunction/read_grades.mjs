import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

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
        
        // Only allow GET requests
        if (event.httpMethod !== 'GET') {
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Method not allowed. Use GET.' })
            };
        }
        
        // Parse query parameters
        const queryParams = event.queryStringParameters || {};
        const { assignmentId, userId, action } = queryParams;
        
        const gradesTableName = process.env.GRADES_TABLE || 'gradesTable';
        
        if (action === 'get-all-grades-for-assignment') {
            // Get all grades for a specific assignment (teacher view)
            if (!assignmentId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'assignmentId is required for this action' })
                };
            }
            
            console.log('🔍 Getting all grades for assignment from gradesTable:', assignmentId);
            
            // Query gradesTable with assignmentId as partition key
            const command = new QueryCommand({
                TableName: gradesTableName,
                KeyConditionExpression: "assignmentId = :assignmentId",
                FilterExpression: "#type = :gradeType",
                ExpressionAttributeValues: {
                    ":assignmentId": assignmentId,
                    ":gradeType": "grade"
                },
                ExpressionAttributeNames: {
                    "#type": "type"
                },
                ScanIndexForward: false // Most recent first
            });
            
            const response = await docClient.send(command);
            
            console.log(`✅ Found ${response.Items?.length || 0} grades for assignment ${assignmentId}`);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    grades: response.Items || [],
                    count: response.Items?.length || 0,
                    assignmentId: assignmentId
                })
            };
        }
        
        else if (action === 'get-all-grades-for-user') {
            // Get all grades for a specific user (student view)
            if (!userId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'userId is required for this action' })
                };
            }
            
            console.log('🔍 Getting all grades for user from gradesTable:', userId);
            
            // Query GSI with userId as partition key
            const command = new QueryCommand({
                TableName: gradesTableName,
                IndexName: process.env.GSI_NAME || 'UserIdIndex',
                KeyConditionExpression: "userId = :userId",
                FilterExpression: "#type = :gradeType",
                ExpressionAttributeValues: {
                    ":userId": userId,
                    ":gradeType": "grade"
                },
                ExpressionAttributeNames: {
                    "#type": "type"
                },
                ScanIndexForward: false // Most recent first
            });
            
            const response = await docClient.send(command);
            
            console.log(`✅ Found ${response.Items?.length || 0} grades for user ${userId}`);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    grades: response.Items || [],
                    count: response.Items?.length || 0,
                    userId: userId
                })
            };
        }
        
        else if (assignmentId && userId) {
            // Get specific grade for specific assignment and user
            console.log('🔍 Getting specific grade from gradesTable:', assignmentId, userId);
            
            const command = new GetCommand({
                TableName: gradesTableName,
                Key: {
                    assignmentId: assignmentId,
                    userId: userId
                }
            });
            
            const response = await docClient.send(command);
            
            if (!response.Item || response.Item.type !== 'grade') {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Grade not found' })
                };
            }
            
            console.log('✅ Found specific grade');
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    grade: response.Item
                })
            };
        }
        
        else {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Invalid request. Provide either: (assignmentId + userId), (assignmentId + action=get-all-grades-for-assignment), or (userId + action=get-all-grades-for-user)' 
                })
            };
        }
        
    } catch (error) {
        console.error('❌ Error reading grades from gradesTable:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to read grades',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};