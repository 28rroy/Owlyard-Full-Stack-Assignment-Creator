import json
import boto3
import os
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """
    Lambda function to retrieve assignments from DynamoDB
    """
    
    # CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    }
    
    try:
        # Handle CORS preflight requests
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({'message': 'CORS preflight handled'})
            }
        
        # Only allow GET requests
        if event.get('httpMethod') != 'GET':
            return {
                'statusCode': 405,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Method not allowed. Use GET.'})
            }
        
        # Get DynamoDB table
        table_name = os.environ.get('DYNAMODB_TABLE_NAME', 'AssignmentsTable')
        table = dynamodb.Table(table_name)
        
        # Check if specific assignment ID is requested
        assignment_id = None
        if 'pathParameters' in event and event['pathParameters']:
            assignment_id = event['pathParameters'].get('assignmentId')
        
        if assignment_id:
            # Get specific assignment
            response = table.get_item(Key={'assignmentId': assignment_id})
            
            if 'Item' not in response:
                return {
                    'statusCode': 404,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'Assignment not found'})
                }
            
            assignment = convert_decimal_to_float(response['Item'])
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'assignment': assignment
                })
            }
        
        else:
            # Get all assignments (scan - use with caution in production)
            response = table.scan()
            assignments = [convert_decimal_to_float(item) for item in response['Items']]
            
            # Sort by creation date (newest first)
            assignments.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'success': True,
                    'assignments': assignments,
                    'count': len(assignments)
                })
            }
        
    except Exception as error:
        # Log the error
        print(f"Error retrieving assignments: {str(error)}")
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

def convert_decimal_to_float(obj):
    """
    Convert Decimal values to float for JSON serialization
    """
    if isinstance(obj, list):
        return [convert_decimal_to_float(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_decimal_to_float(value) for key, value in obj.items()}
    elif isinstance(obj, Decimal):
        return float(obj)
    else:
        return obj