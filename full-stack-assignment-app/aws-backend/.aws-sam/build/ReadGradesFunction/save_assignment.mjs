// aws-backend/assignment_functions/save_assignment.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

export const handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }

    try {
        const tableName = process.env.DYNAMODB_TABLE_NAME;
        
        if (!tableName) {
            throw new Error('DYNAMODB_TABLE_NAME environment variable not set');
        }

        const body = JSON.parse(event.body);
        console.log('Parsed body:', body);
        
        // ⭐ UPDATED: Extract new settings with defaults
        const {
            title,
            questions,
            userId,
            assignmentOwnerId,
            assignmentId: existingAssignmentId,
            showCorrectAnswers = true,    // ⭐ NEW: Default to true
            isGradedForPoints = true,     // ⭐ NEW: Default to true
            metadata
        } = body;

        // Validation
        if (!title || !questions || !userId || !assignmentOwnerId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Missing required fields: title, questions, userId, assignmentOwnerId' 
                })
            };
        }

        // Generate assignment ID for new assignments
        const assignmentId = existingAssignmentId || uuidv4();
        const isEditing = !!existingAssignmentId;
        
        console.log(isEditing ? 'Updating existing assignment:' : 'Creating new assignment:', assignmentId);

        // ⭐ UPDATED: Separate questions and correct answers for security
        const cleanQuestions = {};
        const correctAnswers = {};
        
        Object.entries(questions).forEach(([key, question]) => {
            // Store clean question data (no correct answers)
            cleanQuestions[key] = {
                question: question.question,
                options: question.options,
                explanation: question.explanation,
                points: question.points || 1
            };
            
            // Store correct answers separately
            correctAnswers[key] = {
                correctOptions: question.correctOptions || []
            };
        });

        // ⭐ UPDATED: Create assignment item with new settings
        const assignmentItem = {
            userId: userId,
            assignmentId: assignmentId,
            assignmentOwnerId: assignmentOwnerId,
            title: title,
            questions: cleanQuestions,          // ⭐ Clean questions only
            correctAnswers: correctAnswers,     // ⭐ Correct answers stored separately
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            totalQuestions: Object.keys(questions).length,
            status: 'active',
            type: 'assignment',
            // ⭐ NEW: Assignment settings
            showCorrectAnswers: showCorrectAnswers,
            isGradedForPoints: isGradedForPoints,
            metadata: metadata || {}
        };

        console.log('Assignment item to save:', {
            ...assignmentItem,
            correctAnswers: '[REDACTED FOR SECURITY]' // Don't log correct answers
        });

        // Check if assignment already exists (for updates)
        if (isEditing) {
            try {
                const existingCommand = new GetCommand({
                    TableName: tableName,
                    Key: {
                        userId: userId,
                        assignmentId: assignmentId
                    }
                });
                
                const existingResponse = await dynamodb.send(existingCommand);
                
                if (existingResponse.Item) {
                    console.log('Updating existing assignment');
                    // Keep original creation date for updates
                    assignmentItem.createdAt = existingResponse.Item.createdAt;
                } else {
                    console.log('Assignment not found for update, creating new one');
                }
            } catch (error) {
                console.error('Error checking existing assignment:', error);
                // Continue with save anyway
            }
        }

        // Save to DynamoDB
        const command = new PutCommand({
            TableName: tableName,
            Item: assignmentItem
        });

        const result = await dynamodb.send(command);
        console.log('DynamoDB save result:', result);

        // ⭐ UPDATED: Return response with new settings
        const response = {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: isEditing ? 'Assignment updated successfully' : 'Assignment saved successfully',
                assignmentId: assignmentId,
                userId: userId,
                assignmentOwnerId: assignmentOwnerId,
                title: title,
                totalQuestions: Object.keys(questions).length,
                // ⭐ NEW: Include settings in response
                showCorrectAnswers: showCorrectAnswers,
                isGradedForPoints: isGradedForPoints,
                timestamp: new Date().toISOString()
            })
        };

        console.log('Sending response:', response);
        return response;

    } catch (error) {
        console.error('Error saving assignment:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to save assignment',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};