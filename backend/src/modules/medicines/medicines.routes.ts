import { Router } from 'express';

export const medicinesRouter = Router();

// Placeholder medicine route group for search, details, substitutes, and disease metadata.
medicinesRouter.get('/', (_request, response) => {
  response.json({
    module: 'medicines',
    status: 'pending',
    next: ['catalogue listing', 'search', 'detail page data', 'substitute suggestions'],
  });
});
