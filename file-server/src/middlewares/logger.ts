import morgan from 'morgan';
import { Request, Response } from 'express';

// Custom token for request ID (if needed in future)
morgan.token('id', (req: Request) => {
  return (req as any).id || 'unknown';
});

// Custom format for development
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// Custom format for production
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

export const logger = (env: string = 'development') => {
  if (env === 'production') {
    return morgan(prodFormat, {
      skip: (req: Request, res: Response) => res.statusCode < 400,
    });
  }
  return morgan(devFormat);
};

