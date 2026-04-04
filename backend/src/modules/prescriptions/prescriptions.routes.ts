import { Router } from 'express';

export const prescriptionsRouter = Router();

// Placeholder prescription route group for upload, verification, and retailer review.
prescriptionsRouter.get('/', (_request, response) => {
  response.json({
    module: 'prescriptions',
    status: 'pending',
    next: ['upload', 'link to order', 'approve or reject', 'store prescription metadata'],
  });
});
