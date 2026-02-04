#!/usr/bin/env python3
"""Simple HTTP server with basic auth"""
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from base64 import b64decode

PORT = int(os.environ.get('PORT', 8080))
USERNAME = os.environ.get('AUTH_USER', 'admin')
PASSWORD = os.environ.get('AUTH_PASS', 'secret')
STATIC_DIR = '/home/user8397/clawd/company-dashboard/dist'

class AuthHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)
    
    def do_AUTH(self):
        self.send_response(401)
        self.send_header('WWW-Authenticate', 'Basic realm="Company Dashboard"')
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(b'Authentication required')
    
    def check_auth(self):
        auth = self.headers.get('Authorization')
        if not auth:
            return False
        try:
            scheme, credentials = auth.split(' ', 1)
            if scheme.lower() != 'basic':
                return False
            decoded = b64decode(credentials).decode('utf-8')
            user, pwd = decoded.split(':', 1)
            return user == USERNAME and pwd == PASSWORD
        except:
            return False
    
    def do_GET(self):
        if not self.check_auth():
            self.do_AUTH()
            return
        super().do_GET()
    
    def do_HEAD(self):
        if not self.check_auth():
            self.do_AUTH()
            return
        super().do_HEAD()

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), AuthHandler)
    print(f"Server running on port {PORT}")
    print(f"Username: {USERNAME}")
    print(f"Password: {PASSWORD}")
    server.serve_forever()
