import express, { Router } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { db } from './db/knex';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { budgetsRouter } from './modules/budgets/budgets.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { expensesRouter } from './modules/expenses/expenses.routes';
import { reportsRouter } from './modules/reports/reports.routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/api/health', async (_req, res) => {
    await db.raw('select 1');
    res.json({ status: 'ok' });
  });

  const protectedApi = Router()
    .use(requireAuth)
    .use('/categories', categoriesRouter)
    .use('/expenses', expensesRouter)
    .use('/budgets', budgetsRouter)
    .use('/dashboard', dashboardRouter)
    .use('/reports', reportsRouter);

  app.use('/api/auth', authRouter);
  app.use('/api', protectedApi);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp();
