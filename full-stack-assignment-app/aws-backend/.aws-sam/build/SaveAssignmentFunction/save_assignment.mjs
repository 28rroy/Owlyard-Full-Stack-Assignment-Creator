import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

// Validation constants
const MAX_QUESTION_LENGTH = 1000;
const MAX_OPTION_LENGTH = 500;
const MAX_QUESTIONS = 100;

export const handler = async (event) => {
    // CORS headers (for error responses)
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
        'Content-Type': 'application/json'
    };
    
    try {
        console.log('Event received:', JSON.stringify(event, null, 2));
        
        // Only allow POST requests (OPTIONS handled by API Gateway)
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
            console.error('JSON parse error:', parseError);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }
        
        // Validate required fields - UPDATED to include userId and assignmentOwnerId
        const requiredFields = ['title', 'questions', 'userId', 'assignmentOwnerId'];
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
        const userId = body.userId; // ADDED: Required partition key
        const assignmentOwnerId = body.assignmentOwnerId; // ADDED: Required for permissions
        const createdAt = body.createdAt || new Date().toISOString();
        const metadata = body.metadata || {};
        
        // Server-side validation
        const questionCount = Object.keys(questions).length;
        if (questionCount > MAX_QUESTIONS) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: `Maximum ${MAX_QUESTIONS} questions allowed. Received ${questionCount} questions.` 
                })
            };
        }
        
        // Validate each question and option length
        for (const [questionKey, questionData] of Object.entries(questions)) {
            if (questionData.question && questionData.question.length > MAX_QUESTION_LENGTH) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ 
                        error: `Question ${questionKey} exceeds maximum length of ${MAX_QUESTION_LENGTH} characters.` 
                    })
                };
            }
            
            if (questionData.options && Array.isArray(questionData.options)) {
                for (let i = 0; i < questionData.options.length; i++) {
                    if (questionData.options[i] && questionData.options[i].length > MAX_OPTION_LENGTH) {
                        return {
                            statusCode: 400,
                            headers: corsHeaders,
                            body: JSON.stringify({ 
                                error: `Question ${questionKey}, Option ${i + 1} exceeds maximum length of ${MAX_OPTION_LENGTH} characters.` 
                            })
                        };
                    }
                }
            }
        }
        
        // Generate unique assignment ID or use existing one for updates
        const assignmentId = body.assignmentId || randomUUID();
        
        // UPDATED: Prepare item with correct structure per boss requirements
        const assignmentItem = {
            userId: userId,                    // PARTITION KEY - who created the assignment
            assignmentId: assignmentId,        // SORT KEY - unique assignment identifier
            assignmentOwnerId: assignmentOwnerId, // ADDED: determines who can view vs edit
            title: assignmentTitle,
            questions: questions,
            createdAt: createdAt,
            metadata: metadata,
            totalQuestions: Object.keys(questions).length,
            status: 'active',
            type: 'assignment'                 // To distinguish from user responses
        };
        
        // Get DynamoDB table name from environment variable
        const tableName = process.env.DYNAMODB_TABLE_NAME || 'AssignmentsTable';
        console.log('Using table:', tableName);
        console.log('Saving assignment with userId:', userId, 'assignmentId:', assignmentId);
        
        // Save to DynamoDB with new key structure
        const dynamoCommand = new PutCommand({
            TableName: tableName,
            Item: assignmentItem
        });
        
        await dynamodb.send(dynamoCommand);
        console.log('Assignment saved to DynamoDB with correct key structure');
        
        // Save to S3 as .quiz file
        const bucketName = process.env.S3_BUCKET_NAME;
        if (bucketName) {
            try {
                const quizFileName = `assignment/${assignmentId}.quiz`;
                const quizFileContent = JSON.stringify(assignmentItem, null, 2);
                
                const s3Command = new PutObjectCommand({
                    Bucket: bucketName,
                    Key: quizFileName,
                    Body: quizFileContent,
                    ContentType: 'application/json',
                    Metadata: {
                        'assignment-id': assignmentId,
                        'user-id': userId,
                        'assignment-owner-id': assignmentOwnerId,
                        'created-at': createdAt,
                        'total-questions': Object.keys(questions).length.toString()
                    }
                });
                
                await s3Client.send(s3Command);
                console.log('Assignment saved to S3:', quizFileName);
            } catch (s3Error) {
                console.warn('Failed to save to S3, but DynamoDB save was successful:', s3Error);
                // Continue - S3 save is optional
            }
        } else {
            console.log('S3 bucket not configured, skipping S3 save');
        }
        
        // Return success response
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Assignment saved successfully',
                assignmentId: assignmentId,
                userId: userId,
                assignmentOwnerId: assignmentOwnerId,
                title: assignmentTitle,
                totalQuestions: Object.keys(questions).length,
                createdAt: createdAt
            })
        };
        
    } catch (error) {
        console.error('Error saving assignment:', error);
        console.error('Error stack:', error.stack);
        
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