import { Router } from 'express';

export const retailersRouter = Router();

// Placeholder retailer route group for nearby pharmacy data and inventory visibility.
retailersRouter.get('/', (_request, response) => {
  response.json({
    module: 'retailers',
    status: 'pending',
    next: ['nearby retailers', 'inventory lookup', 'distance sorting', 'availability checks'],
  });
});
