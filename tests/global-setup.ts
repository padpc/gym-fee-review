import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export default async function globalSetup() {
  const distDirectory = resolve(import.meta.dirname, '..', 'dist');
  const testPort = Number(process.env.PLAYWRIGHT_TEST_PORT ?? 4173);
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${testPort}`);
      const decodedPath = decodeURIComponent(requestUrl.pathname);
      const filePath = resolve(
        distDirectory,
        `.${decodedPath.endsWith('/') ? `${decodedPath}index.html` : decodedPath}`,
      );

      if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }

      const body = await readFile(filePath);
      response.writeHead(200, {
        'Content-Type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
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
