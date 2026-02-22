import os
import json
from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.error
import traceback

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

# Enable mock mode if Azure credentials are not available
USE_MOCK_MODE = os.environ.get('USE_MOCK_ANALYSIS', 'false').lower() == 'true'


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.end_headers()

    def _generate_mock_response(self, insights):
        """Generate a mock response for testing when Azure is not available"""
        print("[INFO] Using mock analysis mode")
        
        # Simple heuristic based on insights
        score = 0.3
        tier = "Low"
        
        # Try to analyze the insights
        insights_str = json.dumps(insights).lower()
        
        if any(word in insights_str for word in ['severe', 'critical', 'emergency', 'acute']):
            score = 0.8
            tier = "High"
        elif any(word in insights_str for word in ['moderate', 'concern', 'abnormal']):
            score = 0.5
            tier = "Moderate"
        
        return {
            'severityScore': score,
            'severityTier': tier,
            'advisingReport': f"Mock Analysis: Based on the provided insights, a {tier.lower()} severity assessment has been generated. This is a test response - please configure Azure Agent credentials for actual AI-powered analysis. Always consult with a healthcare professional for medical advice."
        }

    def do_POST(self):
        """Handle POST requests to analyze insights"""
        try:
            print("[INFO] Received POST request to analyze-insights")
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            
            print(f"[DEBUG] Request data: {json.dumps(data)[:200]}...")

            insights = data.get('insights')
            if not insights:
                self._send_error(400, "Missing insights")
                return

            # Get Azure configuration from environment
            azure_agent_key = os.environ.get('AZURE_AGENT_KEY')
            azure_agent_endpoint = os.environ.get('AZURE_AGENT_ENDPOINT')

            # Check if we should use mock mode
            if USE_MOCK_MODE or not azure_agent_key or not azure_agent_endpoint:
                if not azure_agent_key or not azure_agent_endpoint:
                    print("[WARNING] Azure Agent credentials not configured, using mock mode")
                    print(f"  AZURE_AGENT_KEY present: {bool(azure_agent_key)}")
                    print(f"  AZURE_AGENT_ENDPOINT present: {bool(azure_agent_endpoint)}")
                
                output = self._generate_mock_response(insights)
                print(f"[INFO] Sending mock response: {output}")
                self._send_json_response(200, output)
                return

            # If we get here, try to use Azure
            print(f"[DEBUG] Calling Azure endpoint: {azure_agent_endpoint}")
            
            insights_json = json.dumps(insights)

            # Prepare request to Azure Agent
            request_data = {
                "messages": [
                    {
                        "role": "user",
                        "content": f"Analyze this insights object and return a JSON response with: severityScore (0–1), severityTier (Low/Moderate/High), and a general advisingReport. Do not provide medical advice. Here is the insights object: {insights_json}"
                    }
                ]
            }

            # Make request to Azure Agent
            req = urllib.request.Request(
                azure_agent_endpoint,
                data=json.dumps(request_data).encode('utf-8'),
                headers={
                    'api-key': azure_agent_key,
                    'Authorization': f'Bearer {azure_agent_key}',
                    'Content-Type': 'application/json'
                },
                method='POST'
            )

            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    agent_data = json.loads(response.read().decode('utf-8'))
            except urllib.error.HTTPError as e:
                error_text = e.read().decode('utf-8')
                print(f"[ERROR] Azure Agent error: {e.code} {error_text}")
                # Fall back to mock mode on Azure error
                print("[INFO] Falling back to mock mode due to Azure error")
                output = self._generate_mock_response(insights)
                self._send_json_response(200, output)
                return
            except Exception as e:
                print(f"[ERROR] Azure request failed: {e}")
                # Fall back to mock mode on network error
                print("[INFO] Falling back to mock mode due to network error")
                output = self._generate_mock_response(insights)
                self._send_json_response(200, output)
                return

            # Extract the structured response
            result = agent_data

            # Handle OpenAI-style format
            if agent_data.get('choices') and len(agent_data['choices']) > 0:
                content = agent_data['choices'][0].get('message', {}).get('content')
                if content:
                    try:
                        result = json.loads(content)
                    except json.JSONDecodeError:
                        result = {'advisingReport': content}

            # Handle direct content string
            if isinstance(agent_data.get('content'), str):
                try:
                    result = json.loads(agent_data['content'])
                except json.JSONDecodeError:
                    result = {'advisingReport': agent_data['content']}

            # Ensure expected fields with defaults
            output = {
                'severityScore': result.get('severityScore', 0.5),
                'severityTier': result.get('severityTier', 'Moderate'),
                'advisingReport': result.get('advisingReport', 'Analysis complete. Please consult a healthcare professional for personalized guidance.')
            }

            print(f"[INFO] Sending Azure response: {output}")
            self._send_json_response(200, output)

        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON decode error: {e}")
            traceback.print_exc()
            self._send_error(400, f"Invalid JSON in request: {str(e)}")
        except Exception as e:
            print(f"[ERROR] analyze-insights error: {type(e).__name__}: {e}")
            traceback.print_exc()
            self._send_error(500, f"Internal server error: {str(e)}")

    def _send_json_response(self, status_code, data):
        """Send JSON response with CORS headers"""
        self.send_response(status_code)
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _send_error(self, status_code, error_message):
        """Send error response"""
        self._send_json_response(status_code, {'error': error_message})

    def log_message(self, format, *args):
        """Override to customize logging - suppress default logging"""
        pass

    def log_request(self, code='-', size='-'):
        """Override to prevent requestline attribute error"""
        pass
