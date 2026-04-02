import 'dotenv/config';
import express, { type Express } from "express";
import cors from 'cors';
import amazonRoutes from "./routes/amazon.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.middleware.js";

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use("/api/amazon", amazonRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;