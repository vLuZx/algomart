import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import amazonRoutes from './routes/amazon.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';
import { requireBearerToken } from './middleware/auth.middleware.js';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use("/api/amazon", requireBearerToken, amazonRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;