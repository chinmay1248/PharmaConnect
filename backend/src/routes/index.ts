import { Router } from 'express';
import { healthRouter } from './health.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { medicinesRouter } from '../modules/medicines/medicines.routes.js';
import { retailersRouter } from '../modules/retailers/retailers.routes.js';
import { wholesellersRouter } from '../modules/wholesellers/wholesellers.routes.js';
import { companiesRouter } from '../modules/companies/companies.routes.js';
import { ordersRouter } from '../modules/orders/orders.routes.js';
import { prescriptionsRouter } from '../modules/prescriptions/prescriptions.routes.js';
import { paymentsRouter } from '../modules/payments/payments.routes.js';
import { invoicesRouter } from '../modules/invoices/invoices.routes.js';
import { notificationsRouter } from '../modules/notifications/notifications.routes.js';
import { analyticsRouter } from '../modules/analytics/analytics.routes.js';

export const apiRouter = Router();

// Registers every domain module under one predictable /api structure.
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/medicines', medicinesRouter);
apiRouter.use('/retailers', retailersRouter);
apiRouter.use('/wholesellers', wholesellersRouter);
apiRouter.use('/companies', companiesRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/prescriptions', prescriptionsRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/invoices', invoicesRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/analytics', analyticsRouter);
