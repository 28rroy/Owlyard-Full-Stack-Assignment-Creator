import json
import boto3
import uuid
import os
from datetime import datetime
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """
    Lambda function to save assignment data to DynamoDB
    Handles POST requests only
    """
    
    # CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    }
    
    try:
        # Only allow POST requests
        if event.get('httpMethod') != 'POST':
            return {
                'statusCode': 405,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Method not allowed. Use POST.'})
            }
        
        # Parse the request body
        if 'body' not in event or not event['body']:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Request body is required'})
            }
        
        # Parse JSON body
        try:
            body = json.loads(event['body'])
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Invalid JSON in request body'})
            }
        
        # Validate required fields
        required_fields = ['title', 'questions']
        for field in required_fields:
            if field not in body:
                return {
                    'statusCode': 400,
                    'headers': cors_headers,
                    'body': json.dumps({'error': f'Missing required field: {field}'})
                }
        
        # Extract assignment data
        assignment_title = body['title']
        questions = body['questions']
        created_at = body.get('createdAt', datetime.utcnow().isoformat())
        metadata = body.get('metadata', {})
        
        # Generate unique assignment ID
        assignment_id = str(uuid.uuid4())
        
        # Prepare item for DynamoDB (convert floats to Decimal for DynamoDB)
        assignment_item = {
            'assignmentId': assignment_id,
            'title': assignment_title,
            'questions': convert_floats_to_decimal(questions),
            'createdAt': created_at,
            'metadata': convert_floats_to_decimal(metadata),
            'totalQuestions': len(questions),
            'status': 'active'
        }
        
        # Get DynamoDB table name from environment variable
        table_name = os.environ.get('DYNAMODB_TABLE_NAME', 'AssignmentsTable')
        table = dynamodb.Table(table_name)
        
        # Save to DynamoDB
        table.put_item(Item=assignment_item)
        
        # Log successful save
        print(f"Assignment saved successfully: {assignment_id}")
        print(f"Title: {assignment_title}")
        print(f"Questions count: {len(questions)}")
        
        # Return success response
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'message': 'Assignment saved successfully',
                'assignmentId': assignment_id,
                'title': assignment_title,
                'questionCount': len(questions)
            })
        }
        
    except Exception as error:
        # Log the error
        print(f"Error saving assignment: {str(error)}")
        print(f"Event: {json.dumps(event)}")
        
        # Return error response
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({
                'success': False,
                'error': 'Internal server error',
                'message': str(error)
            })
        }

def convert_floats_to_decimal(obj):
    """
    Convert float values to Decimal for DynamoDB compatibility
    """
    if isinstance(obj, list):
        return [convert_floats_to_decimal(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_floats_to_decimal(value) for key, value in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj