import { Request, Response, NextFunction } from 'express';

export interface RequestLogInfo {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  ip?: string;
  userAgent?: string;
  userId?: string;
  initiative?: string;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Log request start
  console.log(`→ ${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logInfo: RequestLogInfo = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      // These will be populated after auth middleware
      userId: (req as any).user?.id,
      initiative: (req as any).user?.initiative
    };

    const emoji = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`${emoji} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, logInfo);
  });

  next();
}