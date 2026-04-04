import { Router } from 'express';

export const healthRouter = Router();

// Simple health route used to confirm the backend is alive.
healthRouter.get('/', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'pharmaconnect-backend',
  });
});
