# Serverless
## AWS - Lambda 

GitHub Repository for Lambda Functions 

The function subscribes to the AWS - SNS service and the sends and email to the user based on the timestamp of the last email sent.  

## Prerequisites for building and deploying application locally:

1. Insall AWS CLI

2. Configure AWS Credentials locally

3. Create your Stack on AWS

4. Upload the serverlese project zip to the lambda function configured on AWS using the following command.
```bash
aws lambda update-function-code --function-name ${FUNCTION_NAME} --zip-file fileb://index.zip --output json > lambda.txt
```

## Build and Deploy using CircleCI:

1. Configure AWS Credentials on CircleCI and add project on CircleCI

2. Create your Stack on AWS

3. Trigger CircleCi build though command line.
   CircleCi will push the code to the configured Lambda Function.
