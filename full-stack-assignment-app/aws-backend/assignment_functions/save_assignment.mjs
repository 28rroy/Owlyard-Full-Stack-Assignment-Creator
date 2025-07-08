import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };
    
    try {
        // Only allow POST requests
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
            };
        }
        
        // Parse the request body
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
        const requiredFields = ['title', 'questions'];
        for (const field of requiredFields) {
            if (!body[field]) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: `Missing required field: ${field}` })
                };
            }
        }
        
        // Extract assignment data
        const assignmentTitle = body.title;
        const questions = body.questions;
        const createdAt = body.createdAt || new Date().toISOString();
        const metadata = body.metadata || {};
        
        // Generate unique assignment ID or use existing one for updates
        const assignmentId = body.assignmentId || randomUUID();
        
        // Prepare item for DynamoDB
        const assignmentItem = {
            assignmentId: assignmentId,
            title: assignmentTitle,
            questions: questions,
            createdAt: createdAt,
            metadata: metadata,
            totalQuestions: Object.keys(questions).length,
            status: 'active'
        };
        
        // Get DynamoDB table name from environment variable
        const tableName = process.env.DYNAMODB_TABLE_NAME || 'AssignmentsTable';
        
        // Save to DynamoDB
        const command = new PutCommand({
            TableName: tableName,
            Item: assignmentItem
        });
        
        await dynamodb.send(command);
        
        // Log successful save
        console.log(`Assignment saved successfully: ${assignmentId}`);
        console.log(`Title: ${assignmentTitle}`);
        console.log(`Questions count: ${Object.keys(questions).length}`);
        
        // Return success response
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Assignment saved successfully',
                assignmentId: assignmentId,
                title: assignmentTitle,
                questionCount: Object.keys(questions).length
            })
        };
        
    } catch (error) {
        // Log the error
        console.error('Error saving assignment:', error);
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