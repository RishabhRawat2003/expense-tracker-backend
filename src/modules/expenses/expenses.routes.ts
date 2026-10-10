import { Router } from 'express';
import { currentUserId } from '../../middleware/auth';
import { idParam, parse } from '../../lib/validation';
import { expenseQuerySchema, expenseSchema, expenseUpdateSchema } from './expenses.schemas';
import * as service from './expenses.service';

export const expensesRouter = Router()
  .get('/', async (req, res) => {
    const query = parse(expenseQuerySchema, req.query);
    res.json(await service.list(currentUserId(req), query));
  })
  .get('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params);
    res.json(await service.findOne(currentUserId(req), id));
  })
  .post('/', async (req, res) => {
    const input = parse(expenseSchema, req.body);
    res.status(201).json(await service.create(currentUserId(req), input));
  })
  .patch('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params);
    const input = parse(expenseUpdateSchema, req.body);
    res.json(await service.update(currentUserId(req), id, input));
  })
  .delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params);
    await service.remove(currentUserId(req), id);
    res.status(204).end();
  });
