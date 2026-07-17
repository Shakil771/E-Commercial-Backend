import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';  
import xss from 'xss-clean'; 
import hpp from 'hpp';
   
import env from './config/env.js';
import routes from './routes/index.js'; 
import { globalLimiter } from './middlewares/rateLimiter.middleware.js';
import notFoundMiddleware from './middlewares/notFound.middleware.js';
import errorMiddleware from './middlewares/error.middleware.js';
import logger from './utils/logger.js';  
import { stripeWebhook } from './controllers/payment.controller.js';

const app = express(); 

// Behind a reverse proxy (Heroku, Nginx, etc.) - needed for correct client IPs & secure cookies
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS - allow the configured client origin with credentials (cookies)
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })
); 

// Stripe webhook must receive the RAW body for signature verification,
// so it is registered before the JSON body parser below.
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Sanitize data against NoSQL query injection
app.use(mongoSanitize());

// Sanitize data against XSS
app.use(xss());

// Prevent HTTP parameter pollution
app.use(
  hpp({
    whitelist: ['price', 'rating', 'category', 'brand', 'sort'],
  })
);

// Compress response bodies
app.use(compression());

// HTTP request logging
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

// Global rate limiting
app.use('/api', globalLimiter);

// API routes
app.use('/api/v1', routes);

// Root health check
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'MERN E-commerce API is running' });
});

// 404 handler for unmatched routes
app.use(notFoundMiddleware);

// Global error handler (must be last)
app.use(errorMiddleware);

export default app;
