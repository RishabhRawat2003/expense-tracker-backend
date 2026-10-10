import { Router } from 'express';
import { currentUserId } from '../../middleware/auth';
import { idParam, parse } from '../../lib/validation';
import { categorySchema, categoryUpdateSchema } from './categories.schemas';
import * as service from './categories.service';

export const categoriesRouter = Router()
  .get('/', async (req, res) => {
    res.json(await service.list(currentUserId(req)));
  })
  .post('/', async (req, res) => {
    const input = parse(categorySchema, req.body);
    res.status(201).json(await service.create(currentUserId(req), input));
  })
  .patch('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params);
    const input = parse(categoryUpdateSchema, req.body);
    res.json(await service.update(currentUserId(req), id, input));
  })
  .delete('/:id', async (req, res) => {
    const { id } = parse(idParam, req.params);
    await service.remove(currentUserId(req), id);
    res.status(204).end();
  });
