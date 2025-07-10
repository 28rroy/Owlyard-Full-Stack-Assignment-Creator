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
        const dynamoCommand = new PutCommand({
            TableName: tableName,
            Item: assignmentItem
        });
        
        await dynamodb.send(dynamoCommand);
        
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
                        'created-at': createdAt,
                        'total-questions': Object.keys(questions).length.toString()
                    }
                });
                
                await s3Client.send(s3Command);
                console.log(`Quiz file saved to S3: ${quizFileName}`);
            } catch (s3Error) {
                console.error('Error saving to S3:', s3Error);
                // Continue execution - S3 save is optional
            }
        }
        
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