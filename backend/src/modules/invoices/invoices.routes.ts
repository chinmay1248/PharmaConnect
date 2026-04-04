import { Router } from 'express';

export const invoicesRouter = Router();

// Placeholder invoice route group for bill generation and download.
invoicesRouter.get('/', (_request, response) => {
  response.json({
    module: 'invoices',
    status: 'pending',
    next: ['invoice record', 'bill summary', 'PDF generation', 'download endpoint'],
  });
});
