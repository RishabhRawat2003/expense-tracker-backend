import { Router } from 'express';
import { currentUserId } from '../../middleware/auth';
import { parse } from '../../lib/validation';
import { reportQuerySchema } from './reports.schemas';
import * as service from './reports.service';

export const reportsRouter = Router()
  .get('/', async (req, res) => {
    const query = parse(reportQuerySchema, req.query);
    res.json(await service.getReport(currentUserId(req), query));
  })
  .get('/export', async (req, res) => {
    const query = parse(reportQuerySchema, req.query);
    const { filename, csv } = await service.buildCsv(currentUserId(req), query);
    res
      .type('text/csv; charset=utf-8')
      .attachment(filename)
      .send(csv);
  });
