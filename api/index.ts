import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAiMiddleware } from '../server/aiMiddleware';

const middleware = createAiMiddleware({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
});

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const routeParam = parsedUrl.searchParams.get('route');

  if (routeParam) {
    req.url = `/api/${routeParam.replace(/^\/+/, '')}`;
  } else if (parsedUrl.pathname === '/api/index') {
    req.url = '/api/health';
  }

  await middleware(req, res, () => {
    if (!res.writableEnded) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Unknown API endpoint' }));
    }
  });
}
