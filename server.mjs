import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;
const DIST = join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

const server = createServer(async (req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';

  // Decode URL-encoded characters (e.g. %20 for spaces in filenames)
  url = decodeURIComponent(url);

  const filePath = join(DIST, url);

  // Prevent directory traversal
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    if (existsSync(filePath)) {
      const data = await readFile(filePath);
      const ext = extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    } else {
      // SPA fallback: serve index.html for non-file routes
      const indexPath = join(DIST, 'index.html');
      const data = await readFile(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    }
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Bip server running on port ${PORT}, serving ${DIST}`);
});
