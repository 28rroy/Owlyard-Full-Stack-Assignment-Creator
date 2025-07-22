import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

// ⭐ ENHANCED: Grade student response with detailed debugging
async function gradeStudentResponse(studentResponses, assignmentId, assignmentOwnerId, tableName) {
    try {
        console.log('🔍 GRADING DEBUG START');
        console.log('🔍 Assignment ID:', assignmentId);
        console.log('🔍 Assignment Owner ID:', assignmentOwnerId);
        console.log('🔍 Table Name:', tableName);
        console.log('🔍 Student Responses:', studentResponses);
        
        // Get the complete assignment with correct answers for grading
        const assignmentCommand = new GetCommand({
            TableName: tableName,
            Key: { 
                userId: assignmentOwnerId,  // Assignment owner has the correct answers
                assignmentId: assignmentId 
            }
        });
        
        console.log('🔍 DynamoDB Query Key:', { 
            userId: assignmentOwnerId, 
            assignmentId: assignmentId 
        });
        
        const assignmentResponse = await dynamodb.send(assignmentCommand);
        
        console.log('🔍 DynamoDB Response:', {
            found: !!assignmentResponse.Item,
            itemKeys: assignmentResponse.Item ? Object.keys(assignmentResponse.Item) : [],
            hasCorrectAnswers: !!(assignmentResponse.Item?.correctAnswers),
            actualUserId: assignmentResponse.Item?.userId,
            actualAssignmentId: assignmentResponse.Item?.assignmentId,
            type: assignmentResponse.Item?.type
        });
        
        if (!assignmentResponse.Item) {
            console.error('❌ Assignment not found for grading');
            console.error('❌ Searched with userId:', assignmentOwnerId, 'assignmentId:', assignmentId);
            
            // 🔍 TRY TO FIND THE ASSIGNMENT WITH A DIFFERENT APPROACH
            console.log('🔍 Attempting to find assignment with scan...');
            const scanCommand = new ScanCommand({
                TableName: tableName,
                FilterExpression: 'assignmentId = :assignmentId AND #type = :assignmentType',
                ExpressionAttributeValues: {
                    ':assignmentId': assignmentId,
                    ':assignmentType': 'assignment'
                },
                ExpressionAttributeNames: {
                    '#type': 'type'
                }
            });
            
            const scanResponse = await dynamodb.send(scanCommand);
            console.log('🔍 Scan results:', scanResponse.Items?.map(item => ({
                userId: item.userId,
                assignmentId: item.assignmentId,
                type: item.type,
                hasCorrectAnswers: !!item.correctAnswers
            })));
            
            return { score: 0, totalPoints: 0, details: [], error: 'Assignment not found' };
        }
        
        if (!assignmentResponse.Item.correctAnswers) {
            console.error('❌ No correct answers found in assignment');
            console.error('❌ Assignment data:', JSON.stringify(assignmentResponse.Item, null, 2));
            return { score: 0, totalPoints: 0, details: [], error: 'No correct answers available' };
        }
        
        const assignment = assignmentResponse.Item;
        const correctAnswers = assignment.correctAnswers;
        const questions = assignment.questions;
        
        let score = 0;
        let totalPoints = 0;
        const gradingDetails = [];
        
        console.log('✅ Successfully found assignment for grading');
        console.log('✅ Correct answers keys:', Object.keys(correctAnswers));
        console.log('✅ Questions keys:', Object.keys(questions || {}));
        console.log('✅ Grading', Object.keys(correctAnswers).length, 'questions');
        
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
            
            console.log(`✅ Question ${questionKey}: Student answered ${studentAnswer}, correct options: [${correctOptions.join(',')}], ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
        });
        
        const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
        
        console.log(`✅ Grading complete: ${score}/${totalPoints} points (${percentage}%)`);
        console.log('🔍 GRADING DEBUG END');
        
        return {
            score,
            totalPoints,
            percentage,
            details: gradingDetails
        };
        
    } catch (error) {
        console.error('❌ Error grading student response:', error);
        console.error('❌ Error stack:', error.stack);
        return { score: 0, totalPoints: 0, details: [], error: error.message };
    }
}

// ⭐ ENHANCED: Submit assignment response with detailed debugging
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
        
        console.log('🔍 SUBMISSION DEBUG START');
        console.log('🔍 Student userId:', userId);
        console.log('🔍 Assignment ID:', assignmentId);
        console.log('🔍 Assignment Owner ID:', assignmentOwnerId);
        console.log('🔍 Student responses:', userAssignmentResponse);
        console.log('🔍 Table name:', tableName);
        
        // Validate required fields
        if (!userId || !assignmentId || !assignmentOwnerId || !userAssignmentResponse) {
            console.error('❌ Missing required fields');
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Missing required fields: userId, assignmentId, assignmentOwnerId, userAssignmentResponse' 
                })
            };
        }
        
        if (!Array.isArray(userAssignmentResponse)) {
            console.error('❌ userAssignmentResponse is not an array');
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'userAssignmentResponse must be an array' })
            };
        }
        
        console.log('✅ All required fields present and valid');
        
        // ⭐ NEW: Grade the response securely using correct answers
        const gradingResult = await gradeStudentResponse(
            userAssignmentResponse, 
            assignmentId, 
            assignmentOwnerId, 
            tableName
        );
        
        if (gradingResult.error) {
            console.error('❌ Grading failed:', gradingResult.error);
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: `Grading failed: ${gradingResult.error}` })
            };
        }
        
        console.log('✅ Grading successful');
        console.log('✅ Final score:', gradingResult.score, '/', gradingResult.totalPoints);
        
        // Create response record with grading results
        const responseItem = {
            userId: userId,
            assignmentId: assignmentId,
            assignmentOwnerId: assignmentOwnerId,
            userAssignmentResponse: userAssignmentResponse,
            score: gradingResult.score,
            totalPoints: gradingResult.totalPoints,
            percentage: gradingResult.percentage,
            gradingDetails: gradingResult.details,
            submittedAt: new Date().toISOString(),
            status: 'submitted',
            type: 'response'
        };
        
        console.log('🔍 Saving response item:', {
            userId: responseItem.userId,
            assignmentId: responseItem.assignmentId,
            assignmentOwnerId: responseItem.assignmentOwnerId,
            score: responseItem.score,
            totalPoints: responseItem.totalPoints
        });
        
        // Save the graded response
        const putCommand = new PutCommand({
            TableName: tableName,
            Item: responseItem
        });
        
        await dynamodb.send(putCommand);
        
        console.log('✅ Assignment response submitted and graded successfully');
        console.log('🔍 SUBMISSION DEBUG END');
        
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
        console.error('❌ Error submitting response:', error);
        console.error('❌ Error stack:', error.stack);
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
        
        if (action === 'debug-db') {
            // ⭐ NEW: Debug database contents
            return await debugDynamoDBContents(event, tableName, corsHeaders);
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

// ⭐ NEW: Debug database contents
async function debugDynamoDBContents(event, tableName, corsHeaders) {
    try {
        console.log('🔍 DYNAMODB DEBUG SCAN START');
        
        // Get all assignments
        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: '#type = :assignmentType',
            ExpressionAttributeValues: {
                ':assignmentType': 'assignment'
            },
            ExpressionAttributeNames: {
                '#type': 'type'
            }
        });
        
        const scanResponse = await dynamodb.send(scanCommand);
        
        console.log('🔍 Found', scanResponse.Items?.length || 0, 'assignments in database');
        
        scanResponse.Items?.forEach((item, index) => {
            console.log(`🔍 Assignment ${index + 1}:`, {
                userId: item.userId,
                assignmentId: item.assignmentId,
                assignmentOwnerId: item.assignmentOwnerId,
                title: item.title,
                type: item.type,
                hasCorrectAnswers: !!item.correctAnswers,
                correctAnswersKeys: item.correctAnswers ? Object.keys(item.correctAnswers) : [],
                questionsCount: item.questions ? Object.keys(item.questions).length : 0,
                createdAt: item.createdAt
            });
        });
        
        // Also get any responses
        const responseScanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: '#type = :responseType',
            ExpressionAttributeValues: {
                ':responseType': 'response'
            },
            ExpressionAttributeNames: {
                '#type': 'type'
            }
        });
        
        const responseScanResponse = await dynamodb.send(responseScanCommand);
        
        console.log('🔍 Found', responseScanResponse.Items?.length || 0, 'responses in database');
        
        responseScanResponse.Items?.forEach((item, index) => {
            console.log(`🔍 Response ${index + 1}:`, {
                userId: item.userId,
                assignmentId: item.assignmentId,
                assignmentOwnerId: item.assignmentOwnerId,
                score: item.score,
                totalPoints: item.totalPoints,
                submittedAt: item.submittedAt
            });
        });
        
        console.log('🔍 DYNAMODB DEBUG SCAN END');
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                assignments: scanResponse.Items || [],
                responses: responseScanResponse.Items || [],
                assignmentCount: scanResponse.Items?.length || 0,
                responseCount: responseScanResponse.Items?.length || 0
            })
        };
        
    } catch (error) {
        console.error('❌ Error debugging DynamoDB:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Failed to debug DynamoDB',
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