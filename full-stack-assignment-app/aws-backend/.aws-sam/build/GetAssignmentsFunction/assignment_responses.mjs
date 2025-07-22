import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

// ⭐ NEW: Grade student response using secure correct answers
async function gradeStudentResponse(studentResponses, assignmentId, assignmentOwnerId, tableName) {
    try {
        console.log('Grading response for assignment:', assignmentId, 'owner:', assignmentOwnerId);
        
        // Get the complete assignment with correct answers for grading
        const assignmentCommand = new GetCommand({
            TableName: tableName,
            Key: { 
                userId: assignmentOwnerId,  // Assignment owner has the correct answers
                assignmentId: assignmentId 
            }
        });
        
        const assignmentResponse = await dynamodb.send(assignmentCommand);
        
        if (!assignmentResponse.Item) {
            console.error('Assignment not found for grading');
            return { score: 0, totalPoints: 0, details: [], error: 'Assignment not found' };
        }
        
        if (!assignmentResponse.Item.correctAnswers) {
            console.error('No correct answers found in assignment');
            return { score: 0, totalPoints: 0, details: [], error: 'No correct answers available' };
        }
        
        const assignment = assignmentResponse.Item;
        const correctAnswers = assignment.correctAnswers;  // ⭐ Secure correct answers
        const questions = assignment.questions;
        
        let score = 0;
        let totalPoints = 0;
        const gradingDetails = [];
        
        console.log('Grading', Object.keys(correctAnswers).length, 'questions');
        
        // Grade each question
        Object.entries(correctAnswers).forEach(([questionKey, correctData], index) => {
            const questionPoints = questions[questionKey]?.points || 1;
            totalPoints += questionPoints;
            
            const studentAnswer = studentResponses[index];
            const correctOptions = correctData.correctOptions || [];
            
            // Check if student's answer is correct
            const isCorrect = correctOptions.includes(studentAnswer);
            
            if (isCorrect) {
                score += questionPoints;
            }
            
            gradingDetails.push({
                questionKey,
                questionPoints,
                studentAnswer,
                correctOptions,
                isCorrect,
                pointsEarned: isCorrect ? questionPoints : 0
            });
            
            console.log(`Question ${questionKey}: Student answered ${studentAnswer}, correct options: [${correctOptions.join(',')}], ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
        });
        
        const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
        
        console.log(`Grading complete: ${score}/${totalPoints} points (${percentage}%)`);
        
        return {
            score,
            totalPoints,
            percentage,
            details: gradingDetails
        };
        
    } catch (error) {
        console.error('Error grading student response:', error);
        return { score: 0, totalPoints: 0, details: [], error: error.message };
    }
}

// Submit assignment response with automatic grading
async function submitResponse(event, tableName, corsHeaders) {
    try {
        let body;
        try {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } catch (parseError) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid JSON in request body' })
            };
        }
        
        const { userId, assignmentId, assignmentOwnerId, userAssignmentResponse } = body;
        
        // Validate required fields
        if (!userId || !assignmentId || !assignmentOwnerId || !userAssignmentResponse) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Missing required fields: userId, assignmentId, assignmentOwnerId, userAssignmentResponse' 
                })
            };
        }
        
        if (!Array.isArray(userAssignmentResponse)) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'userAssignmentResponse must be an array' })
            };
        }
        
        console.log('Submitting response from user:', userId, 'for assignment:', assignmentId);
        
        // ⭐ NEW: Grade the response securely using correct answers
        const gradingResult = await gradeStudentResponse(
            userAssignmentResponse, 
            assignmentId, 
            assignmentOwnerId, 
            tableName
        );
        
        if (gradingResult.error) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: `Grading failed: ${gradingResult.error}` })
            };
        }
        
        // Create response record with grading results
        const responseItem = {
            userId: userId,                          // Student who submitted
            assignmentId: assignmentId,              // Assignment ID (sort key for responses)
            assignmentOwnerId: assignmentOwnerId,    // Teacher who created the assignment
            userAssignmentResponse: userAssignmentResponse, // Student's answers
            score: gradingResult.score,              // ⭐ NEW: Calculated score
            totalPoints: gradingResult.totalPoints,  // ⭐ NEW: Total possible points
            percentage: gradingResult.percentage,    // ⭐ NEW: Percentage score
            gradingDetails: gradingResult.details,   // ⭐ NEW: Detailed grading results
            submittedAt: new Date().toISOString(),
            status: 'submitted',
            type: 'response'
        };
        
        // Save the graded response
        const putCommand = new PutCommand({
            TableName: tableName,
            Item: responseItem
        });
        
        await dynamodb.send(putCommand);
        
        console.log('Assignment response submitted and graded successfully');
        console.log('Final score:', gradingResult.score, '/', gradingResult.totalPoints, `(${gradingResult.percentage}%)`);
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Assignment submitted and automatically graded',
                score: gradingResult.score,
                totalPoints: gradingResult.totalPoints,
                percentage: gradingResult.percentage,
                submittedAt: responseItem.submittedAt,
                gradingSummary: `${gradingResult.score}/${gradingResult.totalPoints} points`
            })
        };
        
    } catch (error) {
        console.error('Error submitting response:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Failed to submit assignment response',
                message: error.message 
            })
        };
    }
}

// Get assignment response or check permissions
async function getResponse(event, tableName, corsHeaders) {
    try {
        const queryParams = event.queryStringParameters || {};
        const { userId, assignmentId, action, assignmentOwnerId } = queryParams;
        
        if (action === 'check-permissions') {
            // Check if user can edit responses
            const canEdit = userId === assignmentOwnerId;
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    canEdit: canEdit,
                    userId: userId,
                    assignmentOwnerId: assignmentOwnerId
                })
            };
        }
        
        if (userId && assignmentId) {
            // Get specific response
            const command = new GetCommand({
                TableName: tableName,
                Key: {
                    userId: userId,
                    assignmentId: assignmentId
                }
            });
            
            const response = await dynamodb.send(command);
            
            if (response.Item && response.Item.type === 'response') {
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: true,
                        response: response.Item
                    })
                };
            } else {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        message: 'No response found'
                    })
                };
            }
        }
        
        if (assignmentId) {
            // Get all responses for an assignment (for teachers)
            const command = new QueryCommand({
                TableName: tableName,
                IndexName: 'AssignmentIdIndex',
                KeyConditionExpression: 'assignmentId = :assignmentId',
                FilterExpression: '#type = :responseType',
                ExpressionAttributeValues: {
                    ':assignmentId': assignmentId,
                    ':responseType': 'response'
                },
                ExpressionAttributeNames: {
                    '#type': 'type'
                }
            });
            
            const response = await dynamodb.send(command);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    responses: response.Items || [],
                    count: response.Items ? response.Items.length : 0
                })
            };
        }
        
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Missing required parameters' })
        };
        
    } catch (error) {
        console.error('Error getting response:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Failed to get assignment response',
                message: error.message 
            })
        };
    }
}

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
        
        const tableName = process.env.DYNAMODB_TABLE_NAME || 'AssignmentsTable';
        
        if (event.httpMethod === 'POST') {
            // Submit assignment response
            return await submitResponse(event, tableName, corsHeaders);
        } else if (event.httpMethod === 'GET') {
            // Get assignment response or check permissions
            return await getResponse(event, tableName, corsHeaders);
        } else {
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }
        
    } catch (error) {
        console.error('Handler error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};