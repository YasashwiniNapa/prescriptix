import os
import json
from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.parse
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
        """Handle POST requests to find nearby hospitals"""
        try:
            # Get Azure Maps API key
            api_key = os.environ.get('AZURE_MAPS_KEY')
            if not api_key:
                self._send_error(500, "AZURE_MAPS_KEY is not configured")
                return

            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            lat = data.get('lat')
            lon = data.get('lon')
            category_filter = data.get('categoryFilter', 'all')

            if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
                self._send_error(400, "lat and lon are required numbers")
                return

            # Build query based on category filter
            query = "hospital"
            if category_filter == "emergency":
                query = "emergency room hospital"
            elif category_filter == "clinic":
                query = "clinic doctor"

            # Build Azure Maps API URL
            params = {
                'api-version': '1.0',
                'query': query,
                'lat': str(lat),
                'lon': str(lon),
                'radius': '15000',
                'limit': '20',
                'subscription-key': api_key
            }

            url = f"https://atlas.microsoft.com/search/poi/json?{urllib.parse.urlencode(params)}"
            
            # Make request to Azure Maps
            req = urllib.request.Request(url, method='GET')
            
            try:
                with urllib.request.urlopen(req) as response:
                    maps_data = json.loads(response.read().decode('utf-8'))
            except urllib.error.HTTPError as e:
                error_text = e.read().decode('utf-8')
                print(f"Azure Maps error: {e.code} {error_text}")
                self._send_error(500, f"Azure Maps error [{e.code}]: {error_text}")
                return

            # Process results
            results = []
            for r in maps_data.get('results', []):
                result = {
                    'name': r.get('poi', {}).get('name', 'Unknown'),
                    'address': r.get('address', {}).get('freeformAddress', ''),
                    'distance': round(r.get('dist')) if r.get('dist') is not None else None,
                    'categories': r.get('poi', {}).get('categories', []),
                    'lat': r.get('position', {}).get('lat'),
                    'lon': r.get('position', {}).get('lon'),
                    'phone': r.get('poi', {}).get('phone')
                }
                results.append(result)

            self._send_json_response(200, {'results': results})

        except Exception as e:
            print(f"Nearby hospitals error: {e}")
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
