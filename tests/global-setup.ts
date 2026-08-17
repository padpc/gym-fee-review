import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; img-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

export default async function globalSetup() {
  const distDirectory = resolve(import.meta.dirname, '..', 'dist');
  const testPort = Number(process.env.PLAYWRIGHT_TEST_PORT ?? 4173);
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${testPort}`);
      const decodedPath = decodeURIComponent(requestUrl.pathname);
      const pageFiles: Record<string, string> = {
        '/': 'index.html',
        '/check': 'check/index.html',
        '/methodology': 'methodology/index.html',
      };
      const relativePath = pageFiles[decodedPath]
        ?? (extname(decodedPath) ? `.${decodedPath}` : '404.html');
      const filePath = resolve(distDirectory, relativePath);

      if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }

      let body: Buffer;
      const responsePath = filePath;
      try {
        body = await readFile(filePath);
      } catch (error) {
        if (!extname(decodedPath)) throw error;
        body = await readFile(resolve(distDirectory, '404.html'));
        response.writeHead(404, {
          ...securityHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        response.end(body);
        return;
      }
      const status = relativePath === '404.html' ? 404 : 200;
      response.writeHead(status, {
        ...securityHeaders,
        'Content-Type': contentTypes[extname(responsePath)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(body);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not Found');
    }
  });

  await new Promise<void>((resolveListening, rejectListening) => {
    server.once('error', rejectListening);
    server.listen(testPort, '127.0.0.1', resolveListening);
  });

  return async () => {
    await new Promise<void>((resolveClosed, rejectClosed) => {
      server.close((error) => (error ? rejectClosed(error) : resolveClosed()));
    });
  };
}
