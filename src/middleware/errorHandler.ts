import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors';
import { env } from '../config/env';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FK_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      errors: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, details: err.details });
    return;
  }

  if (typeof err?.status === 'number' && err.status < 500 && err.expose) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  switch (err?.code) {
    case PG_UNIQUE_VIOLATION:
      res.status(409).json({ message: 'Resource already exists' });
      return;
    case PG_FK_VIOLATION:
      res.status(409).json({ message: 'Referenced resource is missing or still in use' });
      return;
    case PG_CHECK_VIOLATION:
      res.status(400).json({ message: 'Value violates a database constraint' });
      return;
  }

  console.error(err);
  res.status(500).json({
    message: 'Internal server error',
    ...(env.isProd ? {} : { stack: err?.stack }),
  });
};
