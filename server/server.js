const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Load env vars
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './.env' });
}

// Import database connection
const { connectDB } = require('./config/db');

// Import route aggregator
const apiRoutes = require('./routes');

// Import error handler
const { errorHandler } = require('./middleware/error');
const { startScheduler } = require('./jobs/scheduler');

// Create Express app
const app = express();

app.set('trust proxy', 1);

// Build the explicit allow-list from CLIENT_URL / FRONTEND_URL (supports comma-separated values).
const rawClientUrls =
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173');

if (process.env.NODE_ENV === 'production' && !rawClientUrls) {
  console.warn(
    '[server] No CLIENT_URL or FRONTEND_URL configured in production. CORS will allow only requests with no origin.'
  );
}

const allowedClientUrls = new Set(
  rawClientUrls
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
);

// In development, allow any localhost / 127.0.0.1 / [::1] origin regardless of
// port so the SPA works whether it is served by Vite's dev server, preview,
// or another local tool.
const isLocalDevOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production') return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
};

const corsOrigin = (origin, callback) => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-side rendering)
  if (!origin) return callback(null, true);

  if (isLocalDevOrigin(origin)) return callback(null, true);

  if (allowedClientUrls.has(origin)) return callback(null, true);

  callback(new Error(`Origin ${origin} not allowed by CORS`));
};

const validateRuntimeConfig = () => {
  const weakSecrets = new Set([
    undefined,
    '',
    'your-super-secret-jwt-key-change-in-production',
    'your-refresh-secret-change-in-production',
  ]);

  if (process.env.NODE_ENV === 'production') {
    if (weakSecrets.has(process.env.JWT_SECRET) || weakSecrets.has(process.env.JWT_REFRESH_SECRET)) {
      throw new Error('Production JWT secrets must be configured with strong non-default values.');
    }
  }
};

// ── Global Middleware ──────────────────────────────────────

// Security headers
app.use(helmet());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 500),
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

// Enable CORS
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

// Stripe webhook needs raw body
app.use('/api/v1/payments/stripe/webhook', express.raw({ type: 'application/json' }));

// Body parser
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Cookie parser
app.use(cookieParser());

// Compression
app.use(compression());

// Rate limiting
app.use(generalLimiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── API Routes ─────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'School Management System API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API v1 routes
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);
app.use('/api/v1', apiRoutes);

// ── Error Handling ─────────────────────────────────────────

// Handle 404 - Route not found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// ── Server Startup ─────────────────────────────────────────

const PORT = process.env.PORT || 5000;

// Connect to database and start server
const startServer = async () => {
  try {
    validateRuntimeConfig();
    await connectDB();

    if (process.env.NODE_ENV !== 'test') {
      startScheduler();
    }

    const server = app.listen(PORT, () => {
      console.log(`
========================================
  School Management System API Server
========================================
  Environment: ${process.env.NODE_ENV || 'development'}
  Port:        ${PORT}
  API Base:    http://localhost:${PORT}/api/v1
  Health:      http://localhost:${PORT}/health
========================================
      `);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('UNCAUGHT EXCEPTION! Shutting down...');
      console.error(err.name, err.message);
      process.exit(1);
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated.');
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
