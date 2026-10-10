import { Router } from 'express';
import { currentUserId } from '../../middleware/auth';
import { currentMonth } from '../../lib/dates';
import { idParam, parse } from '../../lib/validation';
import { budgetQuerySchema, budgetSchema, budgetUpdateSchema, copyBudgetsSchema } from './budgets.schemas';
import * as service from './budgets.service';

export const budgetsRouter = Router()
  .get('/', async (req, res) => {
    const { month = currentMonth() } = parse(budgetQuerySchema, req.query);
    res.json(await service.list(currentUserId(req), month));
  })
  .post('/', async (req, res) => {
    const input = parse(budgetSchema, req.body);
    res.status(201).json(await service.create(currentUserId(req), input));
  })
  .post('/copy', async (req, res) => {
    const { fromMonth, toMonth } = parse(copyBudgetsSchema, req.body);
    const copied = await service.copyMonth(currentUserId(req), fromMonth, toMonth);
    res.json({ copied });
  })
  .patch('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params);
    const { amount } = parse(budgetUpdateSchema, req.body);
    res.json(await service.update(currentUserId(req), id, amount));
  })
  .delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params);
    await service.remove(currentUserId(req), id);
    res.status(204).end();
  });
