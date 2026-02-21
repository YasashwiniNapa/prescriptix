"""
Local development server for testing Python backend functions
Run this script to test all three functions locally
"""
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import importlib.util


class RouterHandler(BaseHTTPRequestHandler):
    """Routes requests to appropriate function handlers"""
    
    def __init__(self, *args, **kwargs):
        # Import handlers from each function
        self.handlers = {}
        functions = ['analyze-insights', 'nearby-hospitals', 'transcribe']
        
        for func_name in functions:
            handler_path = os.path.join(os.path.dirname(__file__), func_name, 'main.py')
            spec = importlib.util.spec_from_file_location(f"{func_name}.main", handler_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            self.handlers[f'/{func_name}'] = module.Handler
        
        super().__init__(*args, **kwargs)
    
    def do_OPTIONS(self):
        """Handle CORS preflight for all endpoints"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
        self.end_headers()
    
    def do_POST(self):
        """Route POST requests to appropriate handler"""
        path = urlparse(self.path).path
        
        if path in self.handlers:
            # Create an instance of the appropriate handler
            handler_class = self.handlers[path]
            handler = handler_class(self.request, self.client_address, self.server)
            handler.do_POST()
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Not found"}')
    
    def log_message(self, format, *args):
        """Custom logging"""
        print(f"[{self.log_date_time_string()}] {format % args}")


def load_env_file(env_path='.env'):
    """Load environment variables from .env file"""
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print(f"✓ Loaded environment variables from {env_path}")
    else:
        print(f"⚠ No .env file found at {env_path}")


def main():
    # Load environment variables
    env_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    load_env_file(env_path)
    
    # Configuration
    host = 'localhost'
    port = 8000
    
    # Start server
    server = HTTPServer((host, port), RouterHandler)
    
    print("\n" + "="*60)
    print("🐍 Python Backend Development Server")
    print("="*60)
    print(f"\n✓ Server running at http://{host}:{port}\n")
    print("Available endpoints:")
    print(f"  • POST http://{host}:{port}/analyze-insights")
    print(f"  • POST http://{host}:{port}/nearby-hospitals")
    print(f"  • POST http://{host}:{port}/transcribe")
    print("\nPress Ctrl+C to stop the server\n")
    print("="*60 + "\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n✓ Server stopped")
        server.shutdown()
        sys.exit(0)


if __name__ == '__main__':
    main()
