# Python Backend Functions

This directory contains Python implementations of the Supabase Edge Functions that were originally written in TypeScript/Deno.

## Functions Overview

### 1. analyze-insights
Analyzes medical screening insights using Azure OpenAI Agent and returns severity scores and advisory reports.

**Endpoint**: `/analyze-insights`
**Method**: POST
**Request Body**:
```json
{
  "insights": {
    // Screening insights object
  }
}
```
**Response**:
```json
{
  "severityScore": 0.5,
  "severityTier": "Moderate",
  "advisingReport": "Analysis complete. Please consult a healthcare professional..."
}
```

**Environment Variables**:
- `AZURE_AGENT_KEY`: Azure OpenAI API key
- `AZURE_AGENT_ENDPOINT`: Azure OpenAI endpoint URL

### 2. nearby-hospitals
Finds nearby hospitals and clinics using Azure Maps API.

**Endpoint**: `/nearby-hospitals`
**Method**: POST
**Request Body**:
```json
{
  "lat": 37.7749,
  "lon": -122.4194,
  "categoryFilter": "emergency" // "emergency", "clinic", or "all"
}
```
**Response**:
```json
{
  "results": [
    {
      "name": "Hospital Name",
      "address": "123 Main St",
      "distance": 1500,
      "categories": ["Hospital"],
      "lat": 37.7749,
      "lon": -122.4194,
      "phone": "+1234567890"
    }
  ]
}
```

**Environment Variables**:
- `AZURE_MAPS_KEY`: Azure Maps subscription key

### 3. transcribe
Transcribes audio files using Azure Whisper API.

**Endpoint**: `/transcribe`
**Method**: POST
**Content-Type**: multipart/form-data
**Request Body**: Audio file uploaded as form data with field name "file"

**Response**:
```json
{
  "text": "Transcribed text from audio"
}
```

**Environment Variables**:
- `AZURE_WHISPER_API_KEY`: Azure OpenAI Whisper API key

## Deployment Options

### Option 1: Deploy to Supabase (Recommended)

While Supabase Edge Functions primarily support Deno/TypeScript, you can deploy Python functions using custom Docker containers:

1. Create a Dockerfile for each function (example for analyze-insights):

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY main.py .
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "-m", "http.server", "8000"]
```

2. Build and deploy using Supabase CLI with custom images.

### Option 2: Deploy to Azure Functions

1. Install Azure Functions Core Tools:
```bash
npm install -g azure-functions-core-tools@4
```

2. Initialize Azure Functions project:
```bash
cd supabase/functions
func init --python
```

3. Create each function:
```bash
func new --name analyze-insights --template "HTTP trigger" --authlevel "anonymous"
func new --name nearby-hospitals --template "HTTP trigger" --authlevel "anonymous"
func new --name transcribe --template "HTTP trigger" --authlevel "anonymous"
```

4. Copy the main.py files to their respective function folders.

5. Deploy to Azure:
```bash
func azure functionapp publish <your-function-app-name>
```

### Option 3: Deploy to AWS Lambda

1. Install Serverless Framework:
```bash
npm install -g serverless
```

2. Create serverless.yml:
```yaml
service: prescriptix-backend

provider:
  name: aws
  runtime: python3.11
  region: us-east-1

functions:
  analyze-insights:
    handler: analyze-insights/main.Handler
    events:
      - http:
          path: analyze-insights
          method: post
          cors: true
    environment:
      AZURE_AGENT_KEY: ${env:AZURE_AGENT_KEY}
      AZURE_AGENT_ENDPOINT: ${env:AZURE_AGENT_ENDPOINT}

  nearby-hospitals:
    handler: nearby-hospitals/main.Handler
    events:
      - http:
          path: nearby-hospitals
          method: post
          cors: true
    environment:
      AZURE_MAPS_KEY: ${env:AZURE_MAPS_KEY}

  transcribe:
    handler: transcribe/main.Handler
    events:
      - http:
          path: transcribe
          method: post
          cors: true
    environment:
      AZURE_WHISPER_API_KEY: ${env:AZURE_WHISPER_API_KEY}
```

3. Deploy:
```bash
serverless deploy
```

### Option 4: Deploy to Google Cloud Functions

1. Deploy each function:
```bash
gcloud functions deploy analyze-insights \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point Handler \
  --set-env-vars AZURE_AGENT_KEY=$AZURE_AGENT_KEY,AZURE_AGENT_ENDPOINT=$AZURE_AGENT_ENDPOINT

gcloud functions deploy nearby-hospitals \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point Handler \
  --set-env-vars AZURE_MAPS_KEY=$AZURE_MAPS_KEY

gcloud functions deploy transcribe \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point Handler \
  --set-env-vars AZURE_WHISPER_API_KEY=$AZURE_WHISPER_API_KEY
```

### Option 5: Run Locally (Development)

Run each function locally for testing:

```bash
# Navigate to a function directory
cd supabase/functions/analyze-insights

# Run the server
python -m http.server 8000 --bind 127.0.0.1
```

Or create a simple test server:

```python
# test_server.py
from http.server import HTTPServer
from main import Handler

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8000), Handler)
    print('Starting server on http://localhost:8000')
    server.serve_forever()
```

Then run:
```bash
python test_server.py
```

## Environment Configuration

Create a `.env` file in the root directory:

```env
AZURE_AGENT_KEY=your_azure_openai_key
AZURE_AGENT_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-15-preview
AZURE_MAPS_KEY=your_azure_maps_key
AZURE_WHISPER_API_KEY=your_azure_whisper_key
```

## Testing

Test each endpoint using curl:

```bash
# Test analyze-insights
curl -X POST http://localhost:8000/analyze-insights \
  -H "Content-Type: application/json" \
  -d '{"insights": {"symptom": "headache"}}'

# Test nearby-hospitals
curl -X POST http://localhost:8000/nearby-hospitals \
  -H "Content-Type: application/json" \
  -d '{"lat": 37.7749, "lon": -122.4194, "categoryFilter": "all"}'

# Test transcribe
curl -X POST http://localhost:8000/transcribe \
  -F "file=@audio.webm"
```

## Migration from TypeScript

The Python backend maintains 100% API compatibility with the original TypeScript/Deno functions:
- Same request/response formats
- Same environment variables
- Same CORS headers
- Same error handling patterns

## Advantages of Python Backend

1. **Better ML/AI Integration**: Native support for ML libraries (scikit-learn, TensorFlow, PyTorch)
2. **Easier Data Processing**: Pandas, NumPy for complex data manipulation
3. **Wider Deployment Options**: Can be deployed to virtually any cloud platform
4. **Standard Library**: All functions use only Python standard library (no external dependencies)
5. **Performance**: Python 3.11+ offers excellent performance for I/O-bound operations

## Security Considerations

1. Always use environment variables for sensitive data
2. Validate all input data before processing
3. Implement rate limiting in production
4. Use HTTPS in production environments
5. Consider adding authentication middleware
6. Regularly update Python runtime and dependencies

## Future Enhancements

- Add request validation using Pydantic
- Implement caching for frequently requested data
- Add comprehensive error logging and monitoring
- Implement retry logic for external API calls
- Add unit tests using pytest
- Add OpenAPI/Swagger documentation
