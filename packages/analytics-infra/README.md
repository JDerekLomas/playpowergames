## Deployed links
- AnalyticsStack.AnalyticsApiEndpoint21C542FB = https://ybsik3qgzl.execute-api.us-east-1.amazonaws.com/dev/
- AnalyticsStack.ApiBaseUrl = https://ybsik3qgzl.execute-api.us-east-1.amazonaws.com/dev/
- Stack ARN: arn:aws:cloudformation:us-east-1:781188149671:stack/AnalyticsStack/acbd0220-aa7c-11f0-8af8-12e6a2b490ab

## Config flags
- S3: https://k8-games.s3.us-east-1.amazonaws.com/analytics/config.json

## Smoke testing with Postman
1) Create a Postman environment variable:
   - `api_base`: `https://ybsik3qgzl.execute-api.us-east-1.amazonaws.com/dev/`

### 1. Ingest
- Create a parent session as root session (parentSessionId and sessionId are the same)

POST `{{api_base}}ingest`
Headers: `Content-Type: application/json`
Body:
```json
{
  "type": "createSession",
  "gameName": "astro-math",
  "parentSessionId": "psess-001",
  "sessionId": "psess-001",
  "sessionStartTime": 1730000000000,
  "userId": "student-123",
  "deviceType": "Computer",
  "sessionStatus": "OPEN"
}
```

- Create a new game session for `astro-math` (child session under the same parent)

POST `{{api_base}}ingest`
Headers: `Content-Type: application/json`
Body:
```json
{
  "type": "createSession",
  "gameName": "astro-math",
  "parentSessionId": "psess-001",
  "sessionId": "sess-astro-001",
  "sessionStartTime": 1730000010000,
  "gameLevelInfo": "game.astro_math.level1",
  "sessionStatus": "OPEN"
}
```

- Create 3 trials (2 correct, 1 incorrect) for the child session

POST `{{api_base}}ingest`
Headers: `Content-Type: application/json`
Body:
```json
{
  "type": "createTrial",
  "items": [
    {
      "sessionId": "sess-astro-001",
      "createdAt": 1730000011000,
      "questionText": "1 + 1",
      "questionMechanic": "addition",
      "achievedPoints": 1,
      "questionMaxPoints": 1,
      "studentResponse": "2",
      "isCorrect": true
    },
    {
      "sessionId": "sess-astro-001",
      "createdAt": 1730000012000,
      "questionText": "2 + 2",
      "questionMechanic": "addition",
      "achievedPoints": 1,
      "questionMaxPoints": 1,
      "studentResponse": "4",
      "isCorrect": true
    },
    {
      "sessionId": "sess-astro-001",
      "createdAt": 1730000013000,
      "questionText": "3 + 5",
      "questionMechanic": "addition",
      "achievedPoints": 0,
      "questionMaxPoints": 1,
      "studentResponse": "9",
      "isCorrect": false
    }
  ]
}
```

- Close the child session, then close the root session (update end times)

POST `{{api_base}}ingest`
Headers: `Content-Type: application/json`
Body:
```json
{
  "type": "updateSession",
  "parentSessionId": "psess-001",
  "sessionId": "sess-astro-001",
  "sessionStatus": "CLOSED",
  "sessionEndTime": 1730000020000
}
```

POST `{{api_base}}ingest`
Headers: `Content-Type: application/json`
Body:
```json
{
  "type": "updateSession",
  "parentSessionId": "psess-001",
  "sessionId": "psess-001",
  "sessionStatus": "CLOSED",
  "sessionEndTime": 1730000025000
}
```

### 2. Query
- Query session data by parent session (all sessions under a parent)

GET `{{api_base}}query?type=sessionData&parentSessionId=psess-001&limit=50&sort=asc`

- Query trials data for a session (all trials)

GET `{{api_base}}query?type=trialsData&sessionId=sess-astro-001&limit=50&sort=asc`

- Query sessions for `astro-math` (by game)

GET `{{api_base}}query?type=sessionData&gameId=astro-math&limit=50&sort=asc`

- Query trials for `sess-astro-001` within a time range

GET `{{api_base}}query?type=trialsData&sessionId=sess-astro-001&createdAt=1730000010000&createdAtEnd=1730000020000&limit=50&sort=asc`

- Query all session data (no filters)

GET `{{api_base}}query?type=sessionData&limit=50&sort=asc`

- Query all trials data (no filters)

GET `{{api_base}}query?type=trialsData&limit=50&sort=asc`

Notes:
- The `api_base` already includes `/dev/`; append `ingest` or `query` directly.
- For `sessionData`, you can filter by `parentSessionId` (with optional `startTime`/`endTime`) OR by `gameId` (via GSI, with optional `startTime`/`endTime`). Optional `sessionStatus` can filter results.
- For `trialsData`, `sessionId` is required; you can optionally filter by `createdAt` exact or range and choose sort order with `sort=asc`.

## AWS Resouces
- API Gateway (REST API)
    - Requests billed per million; data transfer out billed.
    - Access logs enabled → extra CloudWatch Logs ingestion/storage.
- AWS Lambda (2 functions: IngestFn, QueryFn)
    - Billed per request and compute duration (GB-seconds).
    - Generates CloudWatch Logs per invocation.
- CloudWatch Logs
    - Api access log group (ApiAccessLogs, 1-week retention): ingestion + storage.
    - Lambda log groups (default retention unless set): ingestion + storage.
- S3 (CDK bootstrap/assets bucket)
    - Stores deployment assets (Lambda bundles, templates).
    - Billed for storage and request ops; typically small but ongoing.
- CloudFormation, IAM
    - No direct ongoing cost.
- Notes to control costs quickly:
    - Set Lambda log group retention (e.g., 7 or 14 days).
    - Keep API Gateway access logs only where needed or use filters/sampling.
    - Periodically purge old assets from the CDK bootstrap bucket if not needed.