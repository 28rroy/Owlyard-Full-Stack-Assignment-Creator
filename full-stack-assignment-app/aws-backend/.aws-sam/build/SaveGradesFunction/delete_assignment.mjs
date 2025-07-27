// aws-backend/assignment_functions/delete_assignment.mjs
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
};

export const handler = async (event) => {
    console.log('Delete Event received:', JSON.stringify(event, null, 2));
    
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
        console.log('Delete request body:', body);
        
        const { userId, assignmentId, assignmentOwnerId } = body;

        // Validation
        if (!userId || !assignmentId || !assignmentOwnerId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Missing required fields: userId, assignmentId, assignmentOwnerId' 
                })
            };
        }

        // Security check: Ensure user can only delete their own assignments
        if (userId !== assignmentOwnerId) {
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Permission denied: You can only delete your own assignments' 
                })
            };
        }

        console.log(`Deleting assignment ${assignmentId} for user ${userId}`);

        // Step 1: Delete the main assignment
        const deleteAssignmentCommand = new DeleteCommand({
            TableName: tableName,
            Key: {
                userId: userId,
                assignmentId: assignmentId
            },
            ConditionExpression: 'attribute_exists(userId) AND attribute_exists(assignmentId)',
            ReturnValues: 'ALL_OLD'
        });

        let deletedAssignment;
        try {
            const deleteResult = await dynamodb.send(deleteAssignmentCommand);
            deletedAssignment = deleteResult.Attributes;
            console.log('✅ Assignment deleted successfully');
        } catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ 
                        error: 'Assignment not found or already deleted' 
                    })
                };
            }
            throw error;
        }

        // Step 2: Delete all associated student responses
        // Query for all responses to this assignment
        const queryResponsesCommand = new QueryCommand({
            TableName: tableName,
            IndexName: 'AssignmentIdIndex', // Assuming you have a GSI on assignmentId
            KeyConditionExpression: 'assignmentId = :assignmentId',
            FilterExpression: '#type = :responseType',
            ExpressionAttributeValues: {
                ':assignmentId': assignmentId,
                ':responseType': 'assignment-response'
            },
            ExpressionAttributeNames: {
                '#type': 'type'
            }
        });

        let responsesToDelete = [];
        try {
            const queryResult = await dynamodb.send(queryResponsesCommand);
            responsesToDelete = queryResult.Items || [];
            console.log(`Found ${responsesToDelete.length} student responses to delete`);
        } catch (error) {
            console.warn('Could not query responses (GSI might not exist):', error.message);
            // Continue without deleting responses - they can be cleaned up later
        }

        // Step 3: Delete student responses in batches (if any found)
        let deletedResponsesCount = 0;
        if (responsesToDelete.length > 0) {
            // DynamoDB batch delete limit is 25 items
            const batchSize = 25;
            for (let i = 0; i < responsesToDelete.length; i += batchSize) {
                const batch = responsesToDelete.slice(i, i + batchSize);
                
                // Delete individual responses (since BatchDeleteCommand might not be available)
                for (const response of batch) {
                    try {
                        const deleteResponseCommand = new DeleteCommand({
                            TableName: tableName,
                            Key: {
                                userId: response.userId,
                                assignmentId: response.assignmentId
                            }
                        });
                        await dynamodb.send(deleteResponseCommand);
                        deletedResponsesCount++;
                    } catch (error) {
                        console.warn(`Failed to delete response for user ${response.userId}:`, error.message);
                        // Continue with other deletions
                    }
                }
            }
            console.log(`✅ Deleted ${deletedResponsesCount} student responses`);
        }

        // Return success response
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Assignment and associated data deleted successfully',
                deletedAssignment: {
                    userId: deletedAssignment?.userId,
                    assignmentId: deletedAssignment?.assignmentId,
                    title: deletedAssignment?.title,
                    createdAt: deletedAssignment?.createdAt
                },
                deletedResponsesCount: deletedResponsesCount,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error deleting assignment:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Failed to delete assignment',
                details: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};