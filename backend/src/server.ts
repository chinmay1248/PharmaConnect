import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

// Starts the backend HTTP server for local development and production hosting.
app.listen(env.PORT, () => {
  console.log(`PharmaConnect backend running on http://localhost:${env.PORT}`);
});
