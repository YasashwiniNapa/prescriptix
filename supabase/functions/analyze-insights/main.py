import os
import json
from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.error

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.end_headers()

    def do_POST(self):
        """Handle POST requests to analyze insights"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            insights = data.get('insights')
            if not insights:
                self._send_error(400, "Missing insights")
                return

            # Get Azure configuration from environment
            azure_agent_key = os.environ.get('AZURE_AGENT_KEY')
            azure_agent_endpoint = os.environ.get('AZURE_AGENT_ENDPOINT')

            if not azure_agent_key or not azure_agent_endpoint:
                self._send_error(500, "Azure Agent not configured")
                return

            insights_json = json.dumps(insights)
            print(f"Calling Azure endpoint: {azure_agent_endpoint}")

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
                with urllib.request.urlopen(req) as response:
                    agent_data = json.loads(response.read().decode('utf-8'))
            except urllib.error.HTTPError as e:
                error_text = e.read().decode('utf-8')
                print(f"Azure Agent error: {e.code} {error_text}")
                self._send_error(502, "Azure Agent request failed")
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

            self._send_json_response(200, output)

        except Exception as e:
            print(f"analyze-insights error: {e}")
            self._send_error(500, str(e))

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
        """Override to customize logging"""
        pass  # Suppress default logging or implement custom logging
