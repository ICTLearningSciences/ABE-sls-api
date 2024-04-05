# ABE-sls-api
serverless api's for ABE

### Local Testing
export JOBS_TABLE_NAME=open-ai-jobs-dev
serverless invoke local --function open_ai_async_request -p events/multistep-prompt-event.json.dist --aws-profile abe
serverless invoke local --function open_ai_async_process -p events/open-ai-async-process.json.dist --aws-profile abe
serverless invoke local --function open_ai_async_status -p events/open-ai-async-status-event.json.dist --aws-profile abe

serverless invoke local --function create_google_doc -p events/create-google-doc-event.json.dist --aws-profile abe
serverless invoke local --function async_document_timeline_process -p events/document-timeline-async-process.json.dist --aws-profile abe