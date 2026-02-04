const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const USERNAME = process.env.AUTH_USER || 'admin';
const PASSWORD = process.env.AUTH_PASS || 'secret123';
const STATIC_DIR = '/home/user8397/clawd/company-dashboard/dist';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.csv': 'text/csv'
};

function checkAuth(req) {
  const auth = req.headers['authorization'];
  if (!auth) return false;
  
  const parts = auth.split(' ');
  if (parts[0] !== 'Basic') return false;
  
  const decoded = Buffer.from(parts[1], 'base64').toString();
  const [user, pass] = decoded.split(':');
  return user === USERNAME && pass === PASSWORD;
}

const server = http.createServer((req, res) => {
  // Check auth
  if (!checkAuth(req)) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Company Dashboard"');
    res.end('Authentication required');
    return;
  }
  
  let filePath = path.join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Try index.html for SPA routes
        fs.readFile(path.join(STATIC_DIR, 'index.html'), (err2, content2) => {
          if (err2) {
            res.statusCode = 404;
            res.end('Not found');
          } else {
            res.setHeader('Content-Type', 'text/html');
            res.end(content2);
          }
        });
      } else {
        res.statusCode = 500;
        res.end('Server error');
      }
    } else {
      res.setHeader('Content-Type', contentType);
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Username: ${USERNAME}`);
  console.log(`Password: ${PASSWORD}`);
});
