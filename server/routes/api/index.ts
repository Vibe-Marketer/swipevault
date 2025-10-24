import { Router } from 'express';
import authRoutes from './auth';
import mailboxesRoutes from './mailboxes';
import swipesRoutes from './swipes';
import collectionsRoutes from './collections';
import webhooksRoutes from './webhooks';
import { apiLimiter, webhookLimiter } from '../../middleware/rateLimiter';

const apiRouter = Router();

// Apply general rate limiting to all API routes
apiRouter.use(apiLimiter);

// Routes with general rate limiting
apiRouter.use(authRoutes); // Auth has its own stricter limiter applied within the route
apiRouter.use('/mailboxes', mailboxesRoutes);
apiRouter.use('/swipes', swipesRoutes);
apiRouter.use('/collections', collectionsRoutes);

// Webhooks with more generous rate limiting (separate limiter)
// Note: We need to create a separate router for webhooks to bypass the general limiter
const webhookRouter = Router();
webhookRouter.use(webhookLimiter);
webhookRouter.use('/webhooks', webhooksRoutes);
apiRouter.use(webhookRouter);

export default apiRouter;
