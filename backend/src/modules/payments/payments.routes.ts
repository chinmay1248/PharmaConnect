import { Router } from 'express';

export const paymentsRouter = Router();

// Placeholder payments route group for online payment records and COD selection.
paymentsRouter.get('/', (_request, response) => {
  response.json({
    module: 'payments',
    status: 'pending',
    next: ['payment intent', 'verification', 'COD flag', 'payment history'],
  });
});
