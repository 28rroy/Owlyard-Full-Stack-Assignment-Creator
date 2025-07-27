// aws-backend/assignment_functions/get_assignments.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
};

// ⭐ UPDATED: Function to return complete assignment data for teachers
function getCompleteAssignmentForTeacher(item) {
    const completeQuestions = {};
    
    // Merge clean questions with correct answers
    Object.entries(item.questions || {}).forEach(([key, question]) => {
        completeQuestions[key] = {
            ...question,
            correctOptions: item.correctAnswers?.[key]?.correctOptions || []
        };
    });
    
    return {
        userId: item.userId,
        assignmentId: item.assignmentId,
        assignmentOwnerId: item.assignmentOwnerId,
        title: item.title,
        questions: completeQuestions,
        createdAt: item.createdAt,
        totalQuestions: item.totalQuestions,
        status: item.status,
        type: item.type,
        // ⭐ NEW: Include assignment settings
        showCorrectAnswers: item.showCorrectAnswers ?? true,
        isGradedForPoints: item.isGradedForPoints ?? true
    };
}

// ⭐ UPDATED: Function to return student-safe assignment data
function cleanAssignmentForStudent(item) {
    // Aggressively clean questions by reconstructing them without any correctOptions
    const cleanQuestions = {};
    Object.entries(item.questions || {}).forEach(([key, question]) => {
        // Only include safe fields, explicitly exclude correctOptions
        cleanQuestions[key] = {
            question: question.question || "",
            options: question.options || [],
            explanation: question.explanation || "",
            points: question.points || 1
        };
        
        // Log for debugging
        if (question.correctOptions) {
            console.log(`⚠️ Removed correctOptions from question ${key} for student safety`);
        }
    });

    console.log(`🔒 Cleaned ${Object.keys(cleanQuestions).length} questions for student`);

    return {
        userId: item.userId,
        assignmentId: item.assignmentId,
        assignmentOwnerId: item.assignmentOwnerId,
        title: item.title,
        questions: cleanQuestions, // Use completely cleaned questions
        createdAt: item.createdAt,
        totalQuestions: item.totalQuestions,
        status: item.status,
        type: item.type,
        // ⭐ NEW: Students need to know these settings for UI behavior
        showCorrectAnswers: item.showCorrectAnswers ?? true,
        isGradedForPoints: item.isGradedForPoints ?? true
    };
}

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

        // Parse query parameters
        const queryParams = event.queryStringParameters || {};
        const userId = queryParams.userId;
        const assignmentId = queryParams.assignmentId;
        const requestingUserId = queryParams.requestingUserId;
        const userRole = queryParams.userRole; // 'teacher' or 'student'
        
        console.log('Query parameters:', { userId, assignmentId, requestingUserId, userRole });
        
        // ⭐ UPDATED: Determine if this is a teacher request (can see complete data)
        const isTeacherRequest = userRole === 'teacher' && requestingUserId === userId;
        
        console.log('Request type:', isTeacherRequest ? 
            'Teacher (complete data)' : 'Student (clean data)');
        
        if (userId && assignmentId) {
            // Get specific assignment for specific user
            console.log('Getting specific assignment:', assignmentId, 'for user:', userId);
            const command = new GetCommand({
                TableName: tableName,
                Key: { 
                    userId: userId,
                    assignmentId: assignmentId 
                }
            });
            
            const response = await dynamodb.send(command);
            
            if (!response.Item || response.Item.type !== 'assignment') {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Assignment not found' })
                };
            }
            
            // ⭐ UPDATED: Return appropriate data based on requester
            const assignmentData = isTeacherRequest 
                ? getCompleteAssignmentForTeacher(response.Item)
                : cleanAssignmentForStudent(response.Item);
            
            console.log('Returning', isTeacherRequest ? 'complete' : 'student-safe', 'assignment data');
            console.log('Assignment settings:', {
                showCorrectAnswers: assignmentData.showCorrectAnswers,
                isGradedForPoints: assignmentData.isGradedForPoints
            });
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    assignment: assignmentData,
                    dataType: isTeacherRequest ? 'complete' : 'student-safe'
                })
            };
        } 
        else if (userId) {
            // Get all assignments for a specific user (teacher's own assignments)
            console.log('Getting all assignments for user:', userId);
            const command = new QueryCommand({
                TableName: tableName,
                KeyConditionExpression: 'userId = :userId',
                FilterExpression: '#type = :assignmentType',
                ExpressionAttributeValues: {
                    ':userId': userId,
                    ':assignmentType': 'assignment'
                },
                ExpressionAttributeNames: {
                    '#type': 'type'
                }
            });
            
            const response = await dynamodb.send(command);
            
            // ⭐ UPDATED: Teachers always get complete data for their own assignments
            const assignments = (response.Items || []).map(item => 
                getCompleteAssignmentForTeacher(item)
            );
            
            console.log(`Found ${assignments.length} assignments for teacher ${userId}`);
            assignments.forEach(assignment => {
                console.log(`Assignment: ${assignment.title}, Settings: showCorrectAnswers=${assignment.showCorrectAnswers}, isGradedForPoints=${assignment.isGradedForPoints}`);
            });
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    assignments: assignments,
                    dataType: 'complete',
                    debug: {
                        userId: userId,
                        assignmentCount: assignments.length,
                        query: 'user-specific'
                    }
                })
            };
        } 
        else {
            // Get all assignments (restore original behavior)
            console.log('Getting all assignments for student browsing');
            const command = new ScanCommand({
                TableName: tableName,
                FilterExpression: '#type = :assignmentType',
                ExpressionAttributeValues: {
                    ':assignmentType': 'assignment'
                },
                ExpressionAttributeNames: {
                    '#type': 'type'
                }
            });
            
            const response = await dynamodb.send(command);
            
            // Return student-safe data for all assignments
            const assignments = (response.Items || []).map(item => 
                cleanAssignmentForStudent(item)
            );
            
            console.log(`Found ${assignments.length} assignments for student browsing`);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    assignments: assignments,
                    dataType: 'student-safe',
                    debug: {
                        assignmentCount: assignments.length,
                        query: 'all-assignments-scan'
                    }
                })
            };
        }

    } catch (error) {
        console.error('Error getting assignments:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to get assignments',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};