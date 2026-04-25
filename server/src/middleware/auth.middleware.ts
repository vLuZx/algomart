import type { Request, Response, NextFunction } from 'express';

/**
 * Verifies that the Authorization header contains `Bearer <token>`
 * matching the API_TOKEN environment variable.
 */
export function requireBearerToken(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = process.env.API_TOKEN;

  if (!expectedToken) {
    res.status(500).json({
      error: 'Server Misconfiguration',
      message: 'API_TOKEN is not configured on the server',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (token !== expectedToken) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}
