# ABE-sls-api
serverless api's for ABE

### Local Testing
export JOBS_TABLE_NAME=open-ai-jobs-dev
serverless invoke local --function open_ai_async_request -p events/multistep-prompt-event.json.dist
serverless invoke local --function open_ai_async_process -p events/open-ai-async-process.json.dist
serverless invoke local --function open_ai_async_status -p events/open-ai-async-status-event.json.dist
