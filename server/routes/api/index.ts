import { Router } from 'express';
import authRoutes from './auth';
import mailboxesRoutes from './mailboxes';
import swipesRoutes from './swipes';
import collectionsRoutes from './collections';
import webhooksRoutes from './webhooks';

const apiRouter = Router();

apiRouter.use(authRoutes);
apiRouter.use('/mailboxes', mailboxesRoutes);
apiRouter.use('/swipes', swipesRoutes);
apiRouter.use('/collections', collectionsRoutes);
apiRouter.use('/webhooks', webhooksRoutes);

export default apiRouter;
