/**
 * Dev preview server — serves the built SPA and proxies /api to the API.
 * Mirrors the production same-origin setup (Caddy: web + api on one origin).
 * Usage: node preview-server.mjs <dist-dir> <api-port> <port>
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , distDirArg, apiPortArg, portArg] = process.argv;
const distDir = path.resolve(distDirArg ?? './dist');
const apiPort = Number(apiPortArg ?? 3100);
const port = Number(portArg ?? 4321);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // API proxy
  if (url.pathname.startsWith('/api/')) {
    const headers = { ...req.headers, host: `localhost:${apiPort}` };
    const proxy = http.request(
      { host: 'localhost', port: apiPort, path: url.pathname + url.search, method: req.method, headers },
      (pres) => {
        res.writeHead(pres.statusCode ?? 500, pres.headers);
        pres.pipe(res);
      },
    );
    proxy.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ statusCode: 502, message: 'API unreachable' }));
    });
    req.pipe(proxy);
    return;
  }

  // Static files with SPA fallback
  let filePath = path.join(distDir, decodeURIComponent(url.pathname));
  if (url.pathname === '/' || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Preview server on :${port} (dist=${distDir}, api→:${apiPort})`);
});
