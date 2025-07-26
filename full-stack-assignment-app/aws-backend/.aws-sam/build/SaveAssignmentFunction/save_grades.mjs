import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

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
        
        // Only allow POST requests
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
            };
        }
        
        // Parse request body
        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }
        
        // Validate required fields
        const { assignmentId, userId, score, totalPoints, percentage, gradingDetails, submittedAt } = body;
        
        if (!assignmentId || !userId || score === undefined || !totalPoints) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Missing required fields: assignmentId, userId, score, totalPoints' 
                })
            };
        }
        
        // Prepare grade item for gradesTable structure
        const gradeItem = {
            assignmentId: assignmentId,     // Partition key
            userId: userId,                 // Sort key
            score: score,
            totalPoints: totalPoints,
            percentage: percentage || Math.round((score / totalPoints) * 100),
            gradingDetails: gradingDetails || [],
            submittedAt: submittedAt || new Date().toISOString(),
            gradedAt: new Date().toISOString(),
            status: 'graded',
            type: 'grade'
        };
        
        // Save to gradesTable only
        const command = new PutCommand({
            TableName: process.env.GRADES_TABLE || 'gradesTable',
            Item: gradeItem
        });
        
        await docClient.send(command);
        
        console.log('✅ Grade saved successfully to gradesTable:', assignmentId, userId, `${score}/${totalPoints}`);
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Grade saved successfully',
                assignmentId: assignmentId,
                userId: userId,
                score: score,
                totalPoints: totalPoints,
                percentage: gradeItem.percentage
            })
        };
        
    } catch (error) {
        console.error('Error saving grade:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to save grade',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};