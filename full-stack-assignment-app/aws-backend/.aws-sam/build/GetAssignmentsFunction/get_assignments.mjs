import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

// ⭐ NEW: Clean assignment data for students (remove correct answers)
function cleanAssignmentForStudent(assignment) {
    const cleanAssignment = { ...assignment };
    
    // Remove correct answers completely from the response
    delete cleanAssignment.correctAnswers;
    
    // Double-check: Ensure questions don't have correct answers either
    if (cleanAssignment.questions) {
        const cleanQuestions = {};
        Object.entries(cleanAssignment.questions).forEach(([key, question]) => {
            cleanQuestions[key] = {
                question: question.question,
                options: question.options,
                explanation: question.explanation,
                points: question.points
                // ⭐ correctOptions deliberately omitted
            };
        });
        cleanAssignment.questions = cleanQuestions;
    }
    
    return cleanAssignment;
}

// ⭐ NEW: Get complete assignment data for teachers/grading
function getCompleteAssignmentForTeacher(assignment) {
    // Teachers get everything including correct answers for grading
    return assignment;
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
        
        // Only allow GET requests (OPTIONS handled by API Gateway)
        if (event.httpMethod !== 'GET') {
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Method not allowed. Use GET.' })
            };
        }
        
        // Get DynamoDB table name from environment variable
        const tableName = process.env.DYNAMODB_TABLE_NAME || 'AssignmentsTable';
        console.log('Using table:', tableName);
        
        // Parse query parameters
        const queryParams = event.queryStringParameters || {};
        const { userId, assignmentId, requestingUserId, userRole } = queryParams;
        
        // ⭐ NEW: Determine if requester is teacher or student
        const isTeacherRequest = userRole === 'teacher' || (requestingUserId && requestingUserId === userId);
        console.log('Request type:', isTeacherRequest ? 'Teacher (complete data)' : 'Student (clean data)');
        
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
            
            // ⭐ NEW: Return appropriate data based on requester
            const assignmentData = isTeacherRequest 
                ? getCompleteAssignmentForTeacher(response.Item)
                : cleanAssignmentForStudent(response.Item);
            
            console.log('Returning', isTeacherRequest ? 'complete' : 'student-safe', 'assignment data');
            
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
            
            // Teachers always get complete data for their own assignments
            const assignments = response.Items || [];
            console.log(`Found ${assignments.length} assignments for teacher ${userId}`);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    assignments: assignments,
                    count: assignments.length,
                    dataType: 'complete',
                    debug: {
                        userId: userId,
                        requestType: 'teacher-assignments',
                        timestamp: new Date().toISOString()
                    }
                })
            };
        } 
        else {
            // Get all assignments (student view - for assignment selection)
            console.log('Getting all assignments for student selection');
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
            
            // ⭐ NEW: Clean all assignments for student view
            const assignments = (response.Items || []).map(assignment => 
                cleanAssignmentForStudent(assignment)
            );
            
            console.log(`Found ${assignments.length} assignments, cleaned for student view`);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    assignments: assignments,
                    count: assignments.length,
                    dataType: 'student-safe',
                    debug: {
                        requestType: 'student-assignment-list',
                        cleanedCorrectAnswers: true,
                        timestamp: new Date().toISOString()
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
                error: 'Failed to retrieve assignments',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};