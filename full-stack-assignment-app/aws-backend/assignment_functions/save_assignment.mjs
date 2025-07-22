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

// ⭐ NEW: Function to separate student data from correct answers
function processQuestionsForStorage(questions) {
    const studentFacingQuestions = {};
    const correctAnswersVector = {};
    
    Object.entries(questions).forEach(([key, question]) => {
        // Student-facing data (NO correct answers)
        studentFacingQuestions[key] = {
            question: question.question,
            options: question.options,
            explanation: question.explanation,
            points: question.points
            // ⭐ correctOptions deliberately omitted
        };
        
        // Secure correct answers storage
        correctAnswersVector[key] = {
            correctOptions: question.correctOptions
        };
    });
    
    return { studentFacingQuestions, correctAnswersVector };
}

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
        
        // Parse request body
        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }
        
        // Extract and validate required fields
        const { title: assignmentTitle, questions, userId, assignmentOwnerId, createdAt, metadata } = body;
        
        // Validate required fields
        if (!assignmentTitle || !questions || !userId || !assignmentOwnerId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Missing required fields: title, questions, userId, assignmentOwnerId' })
            };
        }
        
        // Validate question count
        const questionCount = Object.keys(questions).length;
        if (questionCount === 0 || questionCount > MAX_QUESTIONS) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: `Invalid number of questions. Must be between 1 and ${MAX_QUESTIONS}. Received ${questionCount} questions.` 
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
        
        // ⭐ NEW: Separate student data from correct answers
        const { studentFacingQuestions, correctAnswersVector } = processQuestionsForStorage(questions);
        
        // ⭐ UPDATED: Prepare item with correct structure and separated correct answers
        const assignmentItem = {
            userId: userId,                    // PARTITION KEY - who created the assignment
            assignmentId: assignmentId,        // SORT KEY - unique assignment identifier
            assignmentOwnerId: assignmentOwnerId, // determines who can view vs edit
            title: assignmentTitle,
            questions: studentFacingQuestions,     // ⭐ NO correct answers here
            correctAnswers: correctAnswersVector,  // ⭐ NEW: secure storage
            createdAt: createdAt || new Date().toISOString(),
            metadata: metadata || { totalQuestions: questionCount },
            totalQuestions: questionCount,
            status: 'active',
            type: 'assignment'                 // To distinguish from user responses
        };
        
        // Get DynamoDB table name from environment variable
        const tableName = process.env.DYNAMODB_TABLE_NAME || 'AssignmentsTable';
        console.log('Using table:', tableName);
        console.log('Saving assignment with separated correct answers');
        console.log('Assignment ID:', assignmentId, 'User ID:', userId);
        
        // Save to DynamoDB with new secure structure
        const dynamoCommand = new PutCommand({
            TableName: tableName,
            Item: assignmentItem
        });
        
        await dynamodb.send(dynamoCommand);
        console.log('Assignment saved to DynamoDB with secure structure');
        
        // Optional: Save to S3 as .quiz file for backup
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
                        'created-at': assignmentItem.createdAt
                    }
                });
                
                await s3Client.send(s3Command);
                console.log('Assignment backed up to S3 successfully');
            } catch (s3Error) {
                console.error('Failed to save to S3 (non-critical):', s3Error);
                // Continue execution - S3 save is optional
            }
        }
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Assignment saved successfully with secure structure',
                assignmentId: assignmentId,
                totalQuestions: questionCount,
                securityNote: 'Correct answers stored securely and separated from student data'
            })
        };
        
    } catch (error) {
        console.error('Error saving assignment:', error);
        
        // Type-safe error handling
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        const errorCause = error instanceof Error && error.cause ? 
            ` Cause: ${JSON.stringify(error.cause)}` : '';
            
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to save assignment',
                message: errorMessage + errorCause,
                timestamp: new Date().toISOString()
            })
        };
    }
};