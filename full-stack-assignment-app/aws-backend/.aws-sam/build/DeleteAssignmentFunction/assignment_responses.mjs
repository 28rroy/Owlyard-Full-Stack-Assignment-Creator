import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

// Grade student response using secure correct answers
async function gradeStudentResponse(studentResponses, assignmentId, assignmentOwnerId, assignmentsTableName) {
    try {
        console.log('Grading response for assignment:', assignmentId, 'owner:', assignmentOwnerId);
        
        // Get the complete assignment with correct answers for grading
        const assignmentCommand = new GetCommand({
            TableName: assignmentsTableName,
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
        const correctAnswers = assignment.correctAnswers;  // Secure correct answers
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
        
        console.log(`Final grading result: ${score}/${totalPoints} points (${percentage}%)`);
        
        return {
            score,
            totalPoints,
            percentage,
            details: gradingDetails
        };
        
    } catch (error) {
        console.error('Error during grading:', error);
        return { score: 0, totalPoints: 0, details: [], error: error.message };
    }
}

// Submit assignment response - Save directly to grades table
async function submitResponse(event, assignmentsTableName, gradesTableName, corsHeaders) {
    try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        
        const { userId, assignmentId, assignmentOwnerId, userAssignmentResponse } = body;
        
        if (!userId || !assignmentId || !assignmentOwnerId || !userAssignmentResponse) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }
        
        console.log('Processing assignment submission:', {
            userId,
            assignmentId,
            assignmentOwnerId,
            responseLength: userAssignmentResponse.length
        });
        
        // Grade the response automatically using secure backend data
        const gradingResult = await gradeStudentResponse(
            userAssignmentResponse, 
            assignmentId, 
            assignmentOwnerId, 
            assignmentsTableName
        );
        
        if (gradingResult.error) {
            console.error('Grading failed:', gradingResult.error);
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Failed to grade assignment',
                    message: gradingResult.error 
                })
            };
        }
      
        // Create grade record for grades table
        const gradeItem = {
            assignmentId: assignmentId,                  // Partition key for grades table
            userId: userId,                              // Sort key for grades table  
            score: gradingResult.score,
            totalPoints: gradingResult.totalPoints,
            percentage: gradingResult.percentage,
            gradingDetails: gradingResult.details,
            userAssignmentResponse: userAssignmentResponse, // Store student's answers
            assignmentOwnerId: assignmentOwnerId,        // For permissions/filtering
            submittedAt: new Date().toISOString(),
            gradedAt: new Date().toISOString(),
            status: 'graded',
            type: 'grade'
        };
        
        // Save directly to grades table
        const putCommand = new PutCommand({
            TableName: gradesTableName,
            Item: gradeItem
        });
        
        await dynamodb.send(putCommand);
        
        console.log('✅ Grade saved directly to grades table');
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
                submittedAt: gradeItem.submittedAt,
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

// Get assignment response or check permissions - Read from grades table
async function getResponse(event, assignmentsTableName, gradesTableName, corsHeaders) {
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
            // Get specific response from grades table
            const command = new GetCommand({
                TableName: gradesTableName,
                Key: {
                    assignmentId: assignmentId,
                    userId: userId
                }
            });
            
            const response = await dynamodb.send(command);
            
            if (!response.Item || response.Item.type !== 'grade') {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Response not found' })
                };
            }
            
            // Convert grades table format to expected response format
            const responseItem = {
                userId: response.Item.userId,
                assignmentId: response.Item.assignmentId,
                assignmentOwnerId: response.Item.assignmentOwnerId,
                userAssignmentResponse: response.Item.userAssignmentResponse,
                score: response.Item.score,
                totalPoints: response.Item.totalPoints,
                percentage: response.Item.percentage,
                gradingDetails: response.Item.gradingDetails,
                submittedAt: response.Item.submittedAt,
                status: 'submitted',
                type: 'response'
            };
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    response: responseItem
                })
            };
        } 
        else if (assignmentId) {
            // Get all responses for an assignment from grades table
            const command = new QueryCommand({
                TableName: gradesTableName,
                KeyConditionExpression: 'assignmentId = :assignmentId',
                FilterExpression: '#type = :gradeType',
                ExpressionAttributeValues: {
                    ':assignmentId': assignmentId,
                    ':gradeType': 'grade'
                },
                ExpressionAttributeNames: {
                    '#type': 'type'
                }
            });
            
            const response = await dynamodb.send(command);
            
            // Convert grades to response format
            const responses = (response.Items || []).map(item => ({
                userId: item.userId,
                assignmentId: item.assignmentId,
                assignmentOwnerId: item.assignmentOwnerId,
                userAssignmentResponse: item.userAssignmentResponse,
                score: item.score,
                totalPoints: item.totalPoints,
                percentage: item.percentage,
                gradingDetails: item.gradingDetails,
                submittedAt: item.submittedAt,
                status: 'submitted',
                type: 'response'
            }));
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    responses: responses,
                    count: responses.length
                })
            };
        }
        else {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Missing required parameters' })
            };
        }
        
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
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
        'Content-Type': 'application/json'
    };
    
    try {
        console.log('Event received:', JSON.stringify(event, null, 2));
        
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'CORS preflight successful' })
            };
        }
        
        const assignmentsTableName = process.env.DYNAMODB_TABLE_NAME || 'AssignmentsTable';
        const gradesTableName = process.env.GRADES_TABLE_NAME || 'gradesTable';
        
        console.log('Using tables:', { assignmentsTableName, gradesTableName });
        
        if (event.httpMethod === 'POST') {
            return await submitResponse(event, assignmentsTableName, gradesTableName, corsHeaders);
        } else if (event.httpMethod === 'GET') {
            return await getResponse(event, assignmentsTableName, gradesTableName, corsHeaders);
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