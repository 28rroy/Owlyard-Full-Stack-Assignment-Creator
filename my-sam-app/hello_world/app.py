import json

def lambda_handler(event, context):
    """
    Lambda function handler for API Gateway requests
    
    Args:
        event: API Gateway event data
        context: Lambda runtime information
        
    Returns:
        dict: HTTP response with status code, headers, and body
    """
    
    # Log the incoming event (visible in CloudWatch)
    print("Received event:", json.dumps(event))
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',  # Enable CORS
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps({
            'message': 'Hello World!',
            'timestamp': context.aws_request_id,
            'function_name': context.function_name
        })
    }