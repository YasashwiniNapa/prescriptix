import os
import json
from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.error
from io import BytesIO

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

WHISPER_URL = "https://avani-mlwjnpc4-eastus2.cognitiveservices.azure.com/openai/deployments/whisper/audio/translations?api-version=2024-06-01"


class MultiPartForm:
    """Helper class to create multipart/form-data"""
    
    def __init__(self):
        self.boundary = b'----WebKitFormBoundary' + os.urandom(16).hex().encode()
        self.data = BytesIO()
    
    def add_file(self, fieldname, filename, file_data, content_type='application/octet-stream'):
        """Add a file to the form"""
        self.data.write(b'--' + self.boundary + b'\r\n')
        self.data.write(f'Content-Disposition: form-data; name="{fieldname}"; filename="{filename}"\r\n'.encode())
        self.data.write(f'Content-Type: {content_type}\r\n\r\n'.encode())
        self.data.write(file_data)
        self.data.write(b'\r\n')
    
    def get_data(self):
        """Get the complete form data"""
        self.data.write(b'--' + self.boundary + b'--\r\n')
        return self.data.getvalue()
    
    def get_content_type(self):
        """Get the Content-Type header value"""
        return f'multipart/form-data; boundary={self.boundary.decode()}'


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.end_headers()

    def do_POST(self):
        """Handle POST requests to transcribe audio"""
        try:
            # Get Azure Whisper API key
            api_key = os.environ.get('AZURE_WHISPER_API_KEY')
            if not api_key:
                self._send_error(500, "AZURE_WHISPER_API_KEY is not configured")
                return

            # Parse multipart form data
            content_type = self.headers.get('Content-Type', '')
            if not content_type.startswith('multipart/form-data'):
                self._send_error(400, "Content-Type must be multipart/form-data")
                return

            # Parse the multipart data
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # Extract boundary from content-type
            content_type_parts = content_type.split(';')
            boundary = None
            for part in content_type_parts:
                if 'boundary=' in part:
                    boundary = part.split('=')[1].strip()
                    break
            
            if not boundary:
                self._send_error(400, "No boundary found in Content-Type")
                return

            # Parse the form data manually
            audio_file = None
            filename = "audio.webm"
            
            # Simple parsing - split by boundary
            parts = body.split(f'--{boundary}'.encode())
            for part in parts:
                if b'Content-Disposition' in part and b'name="file"' in part:
                    # Extract filename if present
                    if b'filename="' in part:
                        filename_start = part.find(b'filename="') + 10
                        filename_end = part.find(b'"', filename_start)
                        filename = part[filename_start:filename_end].decode('utf-8')
                    
                    # Extract file data (after the double CRLF)
                    file_start = part.find(b'\r\n\r\n') + 4
                    file_end = part.rfind(b'\r\n')
                    if file_start > 3 and file_end > file_start:
                        audio_file = part[file_start:file_end]
                    break

            if not audio_file:
                self._send_error(400, "No audio file provided")
                return

            # Create multipart form for Azure Whisper
            form = MultiPartForm()
            form.add_file('file', filename, audio_file, 'audio/webm')
            form_data = form.get_data()

            # Make request to Azure Whisper API
            req = urllib.request.Request(
                WHISPER_URL,
                data=form_data,
                headers={
                    'api-key': api_key,
                    'Content-Type': form.get_content_type()
                },
                method='POST'
            )

            try:
                with urllib.request.urlopen(req) as response:
                    result = json.loads(response.read().decode('utf-8'))
            except urllib.error.HTTPError as e:
                error_text = e.read().decode('utf-8')
                print(f"Whisper API error: {e.code} {error_text}")
                self._send_error(500, f"Whisper API error [{e.code}]: {error_text}")
                return

            self._send_json_response(200, {'text': result.get('text', '')})

        except Exception as e:
            print(f"Transcribe error: {e}")
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
