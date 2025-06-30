import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",");

export const handler = async (event) => {
    // Set up CORS headers
    const origin = event.headers?.origin || event.headers?.Origin;
    const corsHeaders = {
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };
    if (origin && allowedOrigins.includes(origin)) {
        corsHeaders['Access-Control-Allow-Origin'] = origin;
    }

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS preflight handled' })
        };
    }

    try {
        // Get requesterId from the authorizer claims
        const requesterId = event.requestContext?.authorizer?.claims?.sub;

        // Logging statement
        const logData = {
            requesterId: requesterId,
            method: event.httpMethod,
            path: event.path,
            sourceIp: event.requestContext?.identity?.sourceIp,
            userAgent: event.requestContext?.identity?.userAgent
        };
        console.log('Request details:', JSON.stringify(logData));

        // Extract query parameters
        const { groupName, groupOwnerName, groupId } = event.queryStringParameters || {};

        // Validate input parameters
        if (!groupName || !groupId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Missing required parameters: groupName and groupId'
                })
            };
        }

        // Prepare the item to be written to DynamoDB
        const item = {
            userId: requesterId,
            groupId: groupId,
            groupOwnerId: requesterId,
            groupOwnerName: groupOwnerName,
            userName: event.requestContext.authorizer.claims.name,
            joinTime: Date.now(),
            groupName: groupName
        };

        // Write to DynamoDB
        const command = new PutCommand({
            TableName: process.env.DYNAMODB_TABLE,
            Item: item
        });

        await docClient.send(command);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Successfully joined group',
                data: item
            })
        };

    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Internal server error',
                error: error.message
            })
        };
    }
};
