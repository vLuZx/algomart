import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import calculationRoutes from './routes/calculation.routes.js';
import sessionsRoutes from './routes/sessions.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';
import { requireBearerToken } from './middleware/auth.middleware.js';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use("/api/calculations", requireBearerToken, calculationRoutes);
app.use("/api/sessions", requireBearerToken, sessionsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;