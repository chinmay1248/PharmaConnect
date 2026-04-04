import { Router } from 'express';

export const notificationsRouter = Router();

// Placeholder notification route group for order updates and approval alerts.
notificationsRouter.get('/', (_request, response) => {
  response.json({
    module: 'notifications',
    status: 'pending',
    next: ['customer notifications', 'retailer alerts', 'order status messages'],
  });
});
