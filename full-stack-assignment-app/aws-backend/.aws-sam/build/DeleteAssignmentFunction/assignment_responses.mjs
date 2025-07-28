// Debug version with enhanced error handling and STRICT multiple choice grading
console.log('🔍 Lambda function starting - assignment_responses.mjs');

let DynamoDBClient, GetCommand, PutCommand, QueryCommand, DynamoDBDocumentClient;

try {
    console.log('📦 Importing AWS SDK modules...');
    const awsSDK = await import('@aws-sdk/client-dynamodb');
    const awsDocClient = await import('@aws-sdk/lib-dynamodb');
    
    DynamoDBClient = awsSDK.DynamoDBClient;
    GetCommand = awsDocClient.GetCommand;  // Import from lib-dynamodb for document client
    PutCommand = awsDocClient.PutCommand;
    QueryCommand = awsDocClient.QueryCommand;
    DynamoDBDocumentClient = awsDocClient.DynamoDBDocumentClient;
    
    console.log('✅ AWS SDK modules imported successfully');
} catch (importError) {
    console.error('❌ Failed to import AWS SDK:', importError);
    throw importError;
}

let dynamodb;
try {
    console.log('🔧 Creating DynamoDB client...');
    dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
    console.log('✅ DynamoDB client created successfully');
} catch (clientError) {
    console.error('❌ Failed to create DynamoDB client:', clientError);
    throw clientError;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler = async (event) => {
    console.log('🚀 Handler function called');
    console.log('📋 Event:', JSON.stringify(event, null, 2));
    
    try {
        // Handle preflight OPTIONS request
        if (event.httpMethod === 'OPTIONS') {
            console.log('✅ Handling OPTIONS request');
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'CORS preflight successful' })
            };
        }
        
        // Check environment variables
        console.log('🔍 Checking environment variables...');
        const tableName = process.env.DYNAMODB_TABLE_NAME;
        const gradesTableName = process.env.GRADES_TABLE || 'gradesTable';
        
        console.log('📝 Environment variables:', {
            DYNAMODB_TABLE_NAME: tableName,
            GRADES_TABLE: gradesTableName,
            GSI_NAME: process.env.GSI_NAME
        });
        
        if (!tableName) {
            console.error('❌ DYNAMODB_TABLE_NAME environment variable not set');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'DYNAMODB_TABLE_NAME environment variable not set',
                    env: process.env
                })
            };
        }

        console.log(`🔄 Processing ${event.httpMethod} request`);
        
        if (event.httpMethod === 'POST') {
            console.log('📤 Handling POST request');
            return await handleSubmitResponse(event, tableName, gradesTableName);
        } else if (event.httpMethod === 'GET') {
            console.log('📥 Handling GET request');
            return await handleGetResponse(event, tableName);
        } else {
            console.log(`❌ Unsupported method: ${event.httpMethod}`);
            return {
                statusCode: 405,
                headers: corsHeaders,
                body: JSON.stringify({ error: `Method ${event.httpMethod} not allowed` })
            };
        }

    } catch (handlerError) {
        console.error('❌ Critical error in handler:', handlerError);
        console.error('❌ Stack trace:', handlerError.stack);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Critical handler error',
                message: handlerError.message,
                stack: handlerError.stack,
                timestamp: new Date().toISOString()
            })
        };
    }
};

// Handle getting existing responses and permissions  
async function handleGetResponse(event, tableName) {
    console.log('🔍 handleGetResponse called');
    
    try {
        const queryParams = event.queryStringParameters || {};
        console.log('📋 Query parameters:', queryParams);
        
        const { userId, assignmentId, action, assignmentOwnerId } = queryParams;

        if (action === 'check-permissions') {
            console.log('✅ Handling permission check');
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    canEdit: true,
                    message: 'Permission check completed'
                })
            };
        }

        if (!userId || !assignmentId) {
            console.log('❌ Missing required parameters for GET');
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Missing required parameters: userId, assignmentId',
                    received: { userId, assignmentId }
                })
            };
        }

        console.log('🔍 Getting existing response:', { userId, assignmentId, tableName });

        // Use GetCommand since we have both keys
        const getCommand = new GetCommand({
            TableName: tableName,
            Key: {
                userId: userId,
                assignmentId: assignmentId
            }
        });

        console.log('📤 Sending get command...');
        const getResult = await dynamodb.send(getCommand);
        console.log('📥 Get result:', {
            hasItem: !!getResult.Item,
            itemType: getResult.Item?.type,
            itemKeys: getResult.Item ? Object.keys(getResult.Item) : []
        });

        if (getResult.Item && getResult.Item.type === 'assignment-response') {
            console.log('✅ Found assignment response');
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    response: getResult.Item
                })
            };
        } else {
            console.log('ℹ️ No assignment response found');
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
        
    } catch (getError) {
        console.error('❌ Error in handleGetResponse:', getError);
        console.error('❌ Stack trace:', getError.stack);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Error in GET handler',
                message: getError.message,
                stack: getError.stack,
                timestamp: new Date().toISOString()
            })
        };
    }
}

// Handle assignment submission with STRICT grading
async function handleSubmitResponse(event, tableName, gradesTableName) {
    console.log('🔍 handleSubmitResponse called');
    
    try {
        console.log('📋 Parsing request body...');
        const body = JSON.parse(event.body);
        console.log('📝 Request body parsed:', body);
        
        const { userId, assignmentId, assignmentOwnerId, userAssignmentResponse } = body;

        console.log('🔍 Processing assignment submission:', {
            userId,
            assignmentId,
            assignmentOwnerId,
            responseLength: userAssignmentResponse?.length
        });

        if (!userId || !assignmentId || !userAssignmentResponse) {
            console.log('❌ Missing required fields for POST');
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Missing required fields: userId, assignmentId, userAssignmentResponse',
                    received: { userId, assignmentId, hasResponse: !!userAssignmentResponse }
                })
            };
        }

        // Get assignment from database for grading
        console.log('🔍 Getting assignment for grading...');
        const getAssignmentCommand = new GetCommand({
            TableName: tableName,
            Key: {
                userId: assignmentOwnerId || 'admin',
                assignmentId: assignmentId
            }
        });

        console.log('📤 Sending get assignment command...');
        const assignmentResult = await dynamodb.send(getAssignmentCommand);
        console.log('📥 Assignment result:', {
            hasItem: !!assignmentResult.Item,
            itemKeys: assignmentResult.Item ? Object.keys(assignmentResult.Item) : []
        });

        if (!assignmentResult.Item) {
            console.log('❌ Assignment not found');
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'Assignment not found',
                    searchedFor: { userId: assignmentOwnerId || 'admin', assignmentId }
                })
            };
        }

        console.log('✅ Assignment found, starting STRICT grading process...');
        const assignment = assignmentResult.Item;
        const questions = assignment.questions || {};
        const correctAnswers = assignment.correctAnswers || {};

        console.log('📊 Assignment grading data:', {
            questionCount: Object.keys(questions).length,
            correctAnswersCount: Object.keys(correctAnswers).length
        });

        // STRICT grading logic with enhanced logging
        let totalScore = 0;
        let totalPossiblePoints = 0;
        const gradingDetails = [];

        console.log('🔄 Starting STRICT question grading...');
        Object.entries(questions).forEach(([questionKey, question], index) => {
            const questionPoints = question.points || 1;
            const studentAnswer = userAssignmentResponse[index];
            const correctAnswerData = correctAnswers[questionKey] || {};
            const correctOptions = correctAnswerData.correctOptions || [];
            const questionType = correctAnswerData.questionType || question.questionType || 'single';

            totalPossiblePoints += questionPoints;

            let isCorrect = false;
            let pointsEarned = 0;

            console.log(`🔍 Grading question ${questionKey} (${questionType}):`, {
                questionType,
                studentAnswer,
                correctOptions,
                questionPoints
            });

            if (questionType === 'multiple') {
                // ✅ STRICT: Multiple choice grading logic - All conditions must be met
                const studentSelections = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
                
                console.log(`🔍 STRICT multiple choice grading for question ${questionKey}:`, {
                    studentSelections,
                    correctOptions,
                    studentCount: studentSelections.length,
                    correctCount: correctOptions.length
                });
                
                // ✅ STRICT REQUIREMENTS: Student must select ALL correct answers and NO incorrect ones
                // AND the number of selections must exactly match the number of correct answers
                const hasAllCorrect = correctOptions.every(correctOption => 
                    studentSelections.includes(correctOption)
                );
                const hasNoIncorrect = studentSelections.every(studentOption => 
                    correctOptions.includes(studentOption)
                );
                const exactCount = studentSelections.length === correctOptions.length;
                
                // ✅ ALL THREE CONDITIONS must be true for full points
                isCorrect = hasAllCorrect && hasNoIncorrect && exactCount;
                
                if (isCorrect) {
                    pointsEarned = questionPoints;
                } else {
                    pointsEarned = 0; // ✅ No partial credit
                }
                
                console.log(`✅ STRICT multiple choice result:`, {
                    hasAllCorrect,
                    hasNoIncorrect,
                    exactCount,
                    isCorrect,
                    pointsEarned,
                    reason: !hasAllCorrect ? 'Missing correct answers' :
                            !hasNoIncorrect ? 'Selected incorrect answers' :
                            !exactCount ? 'Wrong number of selections' : 'Perfect match'
                });
            } else {
                // Single choice grading logic
                const studentChoice = Array.isArray(studentAnswer) ? 
                    studentAnswer[0] : studentAnswer;
                isCorrect = correctOptions.includes(studentChoice);
                
                if (isCorrect) {
                    pointsEarned = questionPoints;
                }
                
                console.log(`✅ Single choice result:`, {
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
                questionType,
                isCorrect,
                pointsEarned
            });

            console.log(`✅ Question ${index + 1} graded:`, {
                questionKey,
                isCorrect,
                pointsEarned,
                runningTotal: totalScore
            });
        });

        const percentage = totalPossiblePoints > 0 ? Math.round((totalScore / totalPossiblePoints) * 100) : 0;

        console.log('📊 Final STRICT grading results:', {
            totalScore,
            totalPossiblePoints,
            percentage,
            questionsGraded: gradingDetails.length
        });

        const currentTimestamp = new Date().toISOString();

        // Create response record for assignmentsTable
        const responseRecord = {
            userId: userId,
            assignmentId: assignmentId,
            assignmentOwnerId: assignmentOwnerId,
            userAssignmentResponse: userAssignmentResponse,
            score: totalScore,
            totalPoints: totalPossiblePoints,
            percentage: percentage,
            gradingDetails: gradingDetails,
            submittedAt: currentTimestamp,
            status: 'completed',
            type: 'assignment-response'
        };

        console.log('💾 Saving response to assignmentsTable...');
        const saveResponseCommand = new PutCommand({
            TableName: tableName,
            Item: responseRecord
        });

        await dynamodb.send(saveResponseCommand);
        console.log('✅ Assignment response saved successfully to assignmentsTable');

        // Try to save to grades table (but don't fail if it doesn't work)
        try {
            console.log('💾 Attempting to save to gradesTable...');
            const gradeRecord = {
                assignmentId: assignmentId,
                userId: userId,
                assignmentOwnerId: assignmentOwnerId,
                score: totalScore,
                totalPoints: totalPossiblePoints,
                percentage: percentage,
                gradingDetails: gradingDetails,
                submittedAt: currentTimestamp,
                gradedAt: currentTimestamp,
                status: 'graded',
                type: 'grade'
            };

            const saveGradeCommand = new PutCommand({
                TableName: gradesTableName,
                Item: gradeRecord
            });

            await dynamodb.send(saveGradeCommand);
            console.log('✅ Grade record saved successfully to gradesTable');
        } catch (gradesError) {
            console.warn('⚠️ Failed to save to gradesTable (continuing anyway):', gradesError.message);
        }

        console.log('🎉 Assignment submission completed successfully with STRICT grading');

        // Return grading results
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Assignment submitted and graded successfully with STRICT grading',
                score: totalScore,
                totalPoints: totalPossiblePoints,
                percentage: percentage,
                gradingSummary: `${gradingDetails.filter(detail => detail.isCorrect).length}/${gradingDetails.length} questions correct`,
                gradingDetails: gradingDetails
            })
        };
        
    } catch (submitError) {
        console.error('❌ Error in handleSubmitResponse:', submitError);
        console.error('❌ Stack trace:', submitError.stack);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: 'Error in POST handler',
                message: submitError.message,
                stack: submitError.stack,
                timestamp: new Date().toISOString()
            })
        };
    }
}