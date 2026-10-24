import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { triageRouter } from './routes/triage';
import { claimWatchRouter } from './routes/claim-watch';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
  }));

  // JSON request parsing with size limit
  app.use(express.json({ limit: '10mb' }));

  // Sensible error handling for malformed JSON bodies
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'Malformed JSON payload in request body' });
    }
    return next(err);
  });

  // Mount API routers
  app.use('/api', triageRouter);
  app.use('/api/claim-watch', claimWatchRouter);

  // Direct health route alias
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'proof-backend',
    });
  });

  // Root welcome
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'PRoof API Server',
      status: 'active',
      docs: '/api/health',
    });
  });

  // 404 Handler for undefined routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err.status === 'number' ? err.status : 500;
    res.status(status).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
}

