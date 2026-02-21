# Quick Start Guide - Python Backend Deployment

## 🚀 Getting Started

### Prerequisites
- Python 3.11 or higher
- Docker (optional, for containerized deployment)
- Azure account with required API keys

### 1. Local Development Setup

#### Step 1: Set up environment variables
Create a `.env` file in the project root:
```bash
AZURE_AGENT_KEY=your_key_here
AZURE_AGENT_ENDPOINT=your_endpoint_here
AZURE_MAPS_KEY=your_key_here
AZURE_WHISPER_API_KEY=your_key_here
```

#### Step 2: Run the development server
```powershell
cd supabase/functions
python dev_server.py
```

The server will start at `http://localhost:8000`

#### Step 3: Test the endpoints
```powershell
python test_functions.py
```

Or test manually:
```powershell
# Test analyze-insights
curl -X POST http://localhost:8000/analyze-insights `
  -H "Content-Type: application/json" `
  -d '{"insights": {"symptom": "headache"}}'

# Test nearby-hospitals
curl -X POST http://localhost:8000/nearby-hospitals `
  -H "Content-Type: application/json" `
  -d '{"lat": 37.7749, "lon": -122.4194, "categoryFilter": "all"}'
```

### 2. Docker Deployment

#### Build and run with Docker Compose
```powershell
cd supabase/functions
docker-compose up -d
```

Endpoints will be available at:
- `http://localhost:8001` - analyze-insights
- `http://localhost:8002` - nearby-hospitals
- `http://localhost:8003` - transcribe

#### Stop the containers
```powershell
docker-compose down
```

### 3. Cloud Deployment

#### Option A: Azure Functions

1. Install Azure Functions Core Tools:
```powershell
npm install -g azure-functions-core-tools@4
```

2. Login to Azure:
```powershell
az login
```

3. Create Function App:
```powershell
az functionapp create `
  --resource-group YourResourceGroup `
  --consumption-plan-location eastus `
  --runtime python `
  --runtime-version 3.11 `
  --functions-version 4 `
  --name prescriptix-backend `
  --storage-account yourstorageaccount
```

4. Configure environment variables:
```powershell
az functionapp config appsettings set `
  --name prescriptix-backend `
  --resource-group YourResourceGroup `
  --settings `
    "AZURE_AGENT_KEY=$env:AZURE_AGENT_KEY" `
    "AZURE_AGENT_ENDPOINT=$env:AZURE_AGENT_ENDPOINT" `
    "AZURE_MAPS_KEY=$env:AZURE_MAPS_KEY" `
    "AZURE_WHISPER_API_KEY=$env:AZURE_WHISPER_API_KEY"
```

5. Deploy:
```powershell
cd supabase/functions
func azure functionapp publish prescriptix-backend
```

#### Option B: AWS Lambda with API Gateway

1. Install AWS CLI and configure:
```powershell
aws configure
```

2. Install Serverless Framework:
```powershell
npm install -g serverless
```

3. Deploy:
```powershell
cd supabase/functions
serverless deploy
```

#### Option C: Google Cloud Functions

1. Install gcloud CLI and login:
```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

2. Deploy each function:
```powershell
# Deploy analyze-insights
gcloud functions deploy analyze-insights `
  --runtime python311 `
  --trigger-http `
  --allow-unauthenticated `
  --entry-point Handler `
  --source analyze-insights `
  --set-env-vars "AZURE_AGENT_KEY=$env:AZURE_AGENT_KEY,AZURE_AGENT_ENDPOINT=$env:AZURE_AGENT_ENDPOINT"

# Deploy nearby-hospitals
gcloud functions deploy nearby-hospitals `
  --runtime python311 `
  --trigger-http `
  --allow-unauthenticated `
  --entry-point Handler `
  --source nearby-hospitals `
  --set-env-vars "AZURE_MAPS_KEY=$env:AZURE_MAPS_KEY"

# Deploy transcribe
gcloud functions deploy transcribe `
  --runtime python311 `
  --trigger-http `
  --allow-unauthenticated `
  --entry-point Handler `
  --source transcribe `
  --set-env-vars "AZURE_WHISPER_API_KEY=$env:AZURE_WHISPER_API_KEY"
```

#### Option D: Azure Container Apps

1. Build and push Docker images:
```powershell
# Login to Azure Container Registry
az acr login --name yourregistry

# Build and push each function
cd supabase/functions/analyze-insights
docker build -t yourregistry.azurecr.io/analyze-insights:latest .
docker push yourregistry.azurecr.io/analyze-insights:latest

cd ../nearby-hospitals
docker build -t yourregistry.azurecr.io/nearby-hospitals:latest .
docker push yourregistry.azurecr.io/nearby-hospitals:latest

cd ../transcribe
docker build -t yourregistry.azurecr.io/transcribe:latest .
docker push yourregistry.azurecr.io/transcribe:latest
```

2. Deploy to Container Apps:
```powershell
# Create Container Apps environment
az containerapp env create `
  --name prescriptix-env `
  --resource-group YourResourceGroup `
  --location eastus

# Deploy each function
az containerapp create `
  --name analyze-insights `
  --resource-group YourResourceGroup `
  --environment prescriptix-env `
  --image yourregistry.azurecr.io/analyze-insights:latest `
  --target-port 8080 `
  --ingress external `
  --env-vars `
    "AZURE_AGENT_KEY=secretref:azure-agent-key" `
    "AZURE_AGENT_ENDPOINT=secretref:azure-agent-endpoint"
```

### 4. Update Frontend to Use New Backend

Update your frontend API calls to point to the new Python backend URLs:

```typescript
// Before (TypeScript/Deno functions)
const response = await supabase.functions.invoke('analyze-insights', {
  body: { insights }
});

// After (Python backend)
const response = await fetch('YOUR_BACKEND_URL/analyze-insights', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ insights })
});
```

Or update your environment variables:
```
VITE_API_BASE_URL=https://your-backend.azurewebsites.net
```

## 📊 Monitoring & Logging

### Local Development
Logs are printed to the console when running `dev_server.py`

### Azure Functions
```powershell
az functionapp log tail --name prescriptix-backend --resource-group YourResourceGroup
```

### AWS Lambda
View logs in CloudWatch console or:
```powershell
serverless logs -f analyze-insights
```

### Google Cloud Functions
```powershell
gcloud functions logs read analyze-insights
```

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **HTTPS Only**: Always use HTTPS in production
3. **Authentication**: Add authentication middleware for production
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Input Validation**: Validate all input data
6. **Secrets Management**: Use Azure Key Vault, AWS Secrets Manager, or GCP Secret Manager

## 🐛 Troubleshooting

### Issue: "AZURE_AGENT_KEY is not configured"
**Solution**: Make sure environment variables are set correctly in your deployment platform

### Issue: Port already in use
**Solution**: Change the port in `dev_server.py` or kill the process using the port:
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Issue: CORS errors
**Solution**: Ensure CORS headers are properly set in the response. The Python functions include CORS headers by default.

### Issue: "Module not found"
**Solution**: Make sure you're running Python 3.11+ and all dependencies are installed

## 📚 Additional Resources

- [Azure Functions Python Documentation](https://docs.microsoft.com/azure/azure-functions/functions-reference-python)
- [AWS Lambda Python Documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
- [Google Cloud Functions Python Documentation](https://cloud.google.com/functions/docs/concepts/python-runtime)
- [Docker Documentation](https://docs.docker.com/)

## 💡 Tips

1. **Start Local**: Always test locally before deploying to cloud
2. **Use Docker**: Docker ensures consistency across environments
3. **Monitor Costs**: Cloud function pricing varies by execution time and memory
4. **Cache Results**: Implement caching for frequently requested data
5. **Async Processing**: For long-running tasks, consider using message queues

## 🎯 Next Steps

1. ✅ Test all functions locally
2. ✅ Choose a deployment platform
3. ✅ Deploy to staging environment
4. ✅ Update frontend API endpoints
5. ✅ Test end-to-end
6. ✅ Deploy to production
7. ✅ Set up monitoring and alerts

---

**Need Help?** Check the README_PYTHON.md for more detailed documentation.
