import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-ratelimit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/authRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import exportRoutes from './routes/exportRoutes';
import adminRoutes from './routes/adminRoutes';

// Import middleware
import { authenticateJWT } from './middleware/authMiddleware';

const app: Express = express();
const PORT = process.env.PORT || 5000;

// ===== Middleware Setup =====

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

app.use(limiter);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== Routes =====

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'bappu.ai backend is running' });
});

// Authentication routes (no auth required)
app.use('/api/auth', authRoutes);

// Assignment routes (auth required)
app.use('/api/assignments', authenticateJWT, assignmentRoutes);

// Export routes (auth required)
app.use('/api/exports', authenticateJWT, exportRoutes);

// Admin routes (auth + admin role required)
app.use('/api/admin', adminRoutes);

// ===== Error Handling =====

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', err);

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
  });
});

// ===== Server Initialization =====

app.listen(PORT, () => {
  console.log(`\n🚀 bappu.ai Backend Server`);
  console.log(`📡 Running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('\n✅ Server is ready to accept requests\n');
});

export default app;
