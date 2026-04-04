import { Router } from 'express';

export const ordersRouter = Router();

// Placeholder orders route group for customer orders and later retailer purchase flows.
ordersRouter.get('/', (_request, response) => {
  response.json({
    module: 'orders',
    status: 'pending',
    next: ['create order', 'list orders', 'track status', 'retailer approval flow'],
  });
});
