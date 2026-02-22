#!/usr/bin/env python3
"""
Test Azure OpenAI Agent connection directly
"""
import os
import json
import urllib.request
import urllib.error
from pathlib import Path

# Load environment variables from supabase/functions/.env
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    print(f"Loading .env from: {env_path}")
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value
else:
    print(f"Warning: .env file not found at {env_path}")

# Get Azure configuration
azure_agent_key = os.environ.get('AZURE_AGENT_KEY')
azure_agent_endpoint = os.environ.get('AZURE_AGENT_ENDPOINT')

# Fix endpoint if it's an AI Foundry URL
if azure_agent_endpoint and 'services.ai.azure.com' in azure_agent_endpoint:
    print("⚠️  Detected AI Foundry endpoint, converting to OpenAI format...")
    # Extract resource name (e.g., avani-mlwjnpc4-eastus2)
    resource_name = azure_agent_endpoint.split('//')[1].split('.')[0]
    
    # Try common deployment names
    deployment_names = ['gpt-4o', 'gpt-4', 'gpt-35-turbo', 'gpt-4-turbo']
    print(f"   Resource: {resource_name}")
    print(f"   Will test deployment names: {', '.join(deployment_names)}")
    print()
else:
    deployment_names = None

print("=" * 60)
print("🔍 Testing Azure OpenAI Agent Connection")
print("=" * 60)
print()

# Check credentials
print("1. Checking credentials...")
print(f"   AZURE_AGENT_KEY: {'✓ Present' if azure_agent_key else '✗ Missing'}")
print(f"   AZURE_AGENT_ENDPOINT: {azure_agent_endpoint if azure_agent_endpoint else '✗ Missing'}")
print()

if not azure_agent_key or not azure_agent_endpoint:
    print("❌ Azure credentials not configured!")
    print("   Please set AZURE_AGENT_KEY and AZURE_AGENT_ENDPOINT in .env file")
    exit(1)

# Test the connection
print("2. Testing connection to Azure OpenAI...")

if deployment_names:
    # Test each deployment name
    for deployment_name in deployment_names:
        test_endpoint = f"https://{resource_name}.openai.azure.com/openai/deployments/{deployment_name}/chat/completions?api-version=2024-02-15-preview"
        print(f"\n   Trying: {deployment_name}")
        print(f"   Endpoint: {test_endpoint}")
        
        test_request = {
            "messages": [
                {
                    "role": "user",
                    "content": "Say 'Hello, I am working!' in JSON format with a 'status' field."
                }
            ]
        }
        
        req = urllib.request.Request(
            test_endpoint,
            data=json.dumps(test_request).encode('utf-8'),
            headers={
                'api-key': azure_agent_key,
                'Content-Type': 'application/json'
            },
            method='POST'
        )
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                response_data = json.loads(response.read().decode('utf-8'))
                
            print(f"   ✅ Success with {deployment_name}!")
            print()
            print("4. Response received:")
            print(json.dumps(response_data, indent=2))
            print()
            print("=" * 60)
            print(f"✅ Azure OpenAI Agent is working!")
            print(f"   Correct deployment: {deployment_name}")
            print(f"   Correct endpoint: {test_endpoint}")
            print("=" * 60)
            exit(0)
            
        except urllib.error.HTTPError as e:
            print(f"   ✗ Failed: HTTP {e.code}")
            continue
        except Exception as e:
            print(f"   ✗ Failed: {type(e).__name__}")
            continue
    
    print()
    print("=" * 60)
    print("❌ All deployment names failed!")
    print("   Please check your Azure OpenAI deployment name")
    print("=" * 60)
    exit(1)

else:
    print(f"   Endpoint: {azure_agent_endpoint}")
    print()

test_request = {
    "messages": [
        {
            "role": "user",
            "content": "Say 'Hello, I am working!' in JSON format with a 'status' field."
        }
    ]
}

req = urllib.request.Request(
    azure_agent_endpoint,
    data=json.dumps(test_request).encode('utf-8'),
    headers={
        'api-key': azure_agent_key,
        'Content-Type': 'application/json'
    },
    method='POST'
)

try:
    print("3. Sending test request...")
    with urllib.request.urlopen(req, timeout=30) as response:
        response_data = json.loads(response.read().decode('utf-8'))
        
    print("✅ Connection successful!")
    print()
    print("4. Response received:")
    print(json.dumps(response_data, indent=2))
    print()
    print("=" * 60)
    print("✅ Azure OpenAI Agent is working correctly!")
    print("=" * 60)
    
except urllib.error.HTTPError as e:
    error_body = e.read().decode('utf-8')
    print(f"❌ HTTP Error {e.code}: {e.reason}")
    print()
    print("Error details:")
    try:
        error_json = json.loads(error_body)
        print(json.dumps(error_json, indent=2))
    except:
        print(error_body)
    print()
    print("=" * 60)
    print("❌ Azure OpenAI Agent connection failed!")
    print("=" * 60)
    
except urllib.error.URLError as e:
    print(f"❌ Network Error: {e.reason}")
    print()
    print("=" * 60)
    print("❌ Could not connect to Azure endpoint!")
    print("=" * 60)
    
except Exception as e:
    print(f"❌ Unexpected error: {type(e).__name__}: {e}")
    print()
    print("=" * 60)
    print("❌ Test failed!")
    print("=" * 60)
