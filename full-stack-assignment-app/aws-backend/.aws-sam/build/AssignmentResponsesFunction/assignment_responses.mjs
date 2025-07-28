// aws-backend/assignment_functions/assignment_responses.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

export const handler = async (event) => {
    console.log('Assignment responses event:', JSON.stringify(event, null, 2));
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }

    const tableName = process.env.DYNAMODB_TABLE_NAME;
    
    if (!tableName) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'DYNAMODB_TABLE_NAME not configured' })
        };
    }

    try {
        if (event.httpMethod === 'POST') {
            return await handleSubmitResponse(event, tableName);
        } else if (event.httpMethod === 'GET') {
            return await handleGetResponse(event, tableName);
        }
        
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    } catch (error) {
        console.error('Error in assignment responses:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};

// ⭐ UPDATED: Handle assignment submission with multiple choice support
async function handleSubmitResponse(event, tableName) {
    const body = JSON.parse(event.body);
    const { userId, assignmentId, assignmentOwnerId, userAssignmentResponse } = body;

    console.log('Processing assignment submission:', {
        userId,
        assignmentId,
        assignmentOwnerId,
        responseLength: userAssignmentResponse?.length
    });

    // Validation
    if (!userId || !assignmentId || !assignmentOwnerId || !userAssignmentResponse) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Missing required fields: userId, assignmentId, assignmentOwnerId, userAssignmentResponse' 
            })
        };
    }

    // Get the original assignment to access correct answers and question types
    const assignmentCommand = new GetCommand({
        TableName: tableName,
        Key: {
            userId: assignmentOwnerId,
            assignmentId: assignmentId
        }
    });

    const assignmentResult = await dynamodb.send(assignmentCommand);
    
    if (!assignmentResult.Item) {
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Assignment not found' })
        };
    }

    const assignment = assignmentResult.Item;
    const questions = assignment.questions || {};
    const correctAnswers = assignment.correctAnswers || {};

    console.log('Assignment retrieved for grading:', {
        questionCount: Object.keys(questions).length,
        correctAnswersCount: Object.keys(correctAnswers).length
    });

    // ⭐ UPDATED: Grade the assignment with multiple choice support
    const gradingDetails = [];
    let totalScore = 0;
    let totalPossiblePoints = 0;

    Object.entries(questions).forEach(([questionKey, question], index) => {
        const questionPoints = question.points || 1;
        const studentAnswer = userAssignmentResponse[index];
        const correctAnswerData = correctAnswers[questionKey] || {};
        const correctOptions = correctAnswerData.correctOptions || [];
        const questionType = correctAnswerData.questionType || question.questionType || 'single';

        totalPossiblePoints += questionPoints;

        let isCorrect = false;
        let pointsEarned = 0;

        console.log(`Grading question ${questionKey}:`, {
            questionType,
            studentAnswer,
            correctOptions,
            questionPoints
        });

        if (questionType === 'multiple') {
            // ⭐ NEW: Multiple choice grading logic
            const studentSelections = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
            
            // For multiple choice: student must select ALL correct answers and NO incorrect ones
            const hasAllCorrect = correctOptions.every(correctOption => 
                studentSelections.includes(correctOption)
            );
            const hasNoIncorrect = studentSelections.every(studentOption => 
                correctOptions.includes(studentOption)
            );
            
            isCorrect = hasAllCorrect && hasNoIncorrect && studentSelections.length === correctOptions.length;
            
            if (isCorrect) {
                pointsEarned = questionPoints;
            }
            
            console.log(`Multiple choice result:`, {
                hasAllCorrect,
                hasNoIncorrect,
                lengthsMatch: studentSelections.length === correctOptions.length,
                isCorrect,
                pointsEarned
            });
        } else {
            // ⭐ EXISTING: Single choice grading logic
            const studentChoice = Array.isArray(studentAnswer) ? studentAnswer[0] : studentAnswer;
            isCorrect = correctOptions.includes(studentChoice);
            
            if (isCorrect) {
                pointsEarned = questionPoints;
            }
            
            console.log(`Single choice result:`, {
                studentChoice,
                correctOptions,
                isCorrect,
                pointsEarned
            });
        }

        totalScore += pointsEarned;

        gradingDetails.push({
            questionKey,
            questionPoints,
            studentAnswer,
            correctOptions,
            questionType,  // ⭐ NEW: Include question type in grading details
            isCorrect,
            pointsEarned
        });
    });

    const percentage = totalPossiblePoints > 0 ? Math.round((totalScore / totalPossiblePoints) * 100) : 0;

    console.log('Final grading results:', {
        totalScore,
        totalPossiblePoints,
        percentage,
        questionsGraded: gradingDetails.length
    });

    // Create response record
    const responseRecord = {
        userId: userId,
        assignmentId: assignmentId,
        assignmentOwnerId: assignmentOwnerId,
        userAssignmentResponse: userAssignmentResponse,
        score: totalScore,
        totalPoints: totalPossiblePoints,
        percentage: percentage,
        gradingDetails: gradingDetails,
        submittedAt: new Date().toISOString(),
        status: 'completed',
        type: 'assignment-response'
    };

    // Save response to database
    const saveCommand = new PutCommand({
        TableName: tableName,
        Item: responseRecord
    });

    await dynamodb.send(saveCommand);

    console.log('Assignment response saved successfully');

    // Return grading results
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            success: true,
            message: 'Assignment submitted and graded successfully',
            score: totalScore,
            totalPoints: totalPossiblePoints,
            percentage: percentage,
            gradingSummary: `${totalScore}/${totalPossiblePoints} points (${percentage}%)`,
            gradingDetails: gradingDetails
        })
    };
}

// Handle getting existing responses
async function handleGetResponse(event, tableName) {
    const queryParams = event.queryStringParameters || {};
    const { userId, assignmentId, action, assignmentOwnerId } = queryParams;

    console.log('Getting response with params:', queryParams);

    if (action === 'check-permissions') {
        // Simple permission check - students can't edit after submission
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                canEdit: false, // Students typically can't edit after submission
                message: 'Permission check completed'
            })
        };
    }

    if (!userId || !assignmentId) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Missing required parameters: userId, assignmentId' 
            })
        };
    }

    // Get existing response
    const command = new GetCommand({
        TableName: tableName,
        Key: {
            userId: userId,
            assignmentId: assignmentId
        }
    });

    const result = await dynamodb.send(command);

    if (!result.Item || result.Item.type !== 'assignment-response') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                response: null,
                message: 'No response found'
            })
        };
    }

    console.log('Response found:', {
        userId: result.Item.userId,
        assignmentId: result.Item.assignmentId,
        score: result.Item.score,
        submittedAt: result.Item.submittedAt
    });

    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            success: true,
            response: result.Item
        })
    };
}