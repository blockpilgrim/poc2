import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Import config
import { config } from './config';
import { validateInitiativesConfig } from './config/initiatives.config';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import routes
import apiRoutes from './routes';

// Create Express app
const app: Application = express();
const PORT = config.PORT;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true
}));

// Body parsing and compression
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Partner Portal v2.0 API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    apiDocs: '/api'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  // Validate initiatives configuration on startup
  const isConfigValid = validateInitiativesConfig();
  if (!isConfigValid && process.env.NODE_ENV === 'production') {
    console.error('❌ Invalid initiatives configuration. Server startup aborted.');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (!isConfigValid) {
      console.warn('⚠️  Initiatives configuration has issues - check logs above');
    }
  });
}

export default app;