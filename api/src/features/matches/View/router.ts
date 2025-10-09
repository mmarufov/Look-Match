import { Router } from 'express';
import { createSearchController } from '../ViewModel/search';

export function createMatchesRouter() {
  const router = Router();
  const controller = createSearchController();
  router.get('/api/matches', controller.handleMatches);
  // Legacy
  router.get('/matches', (req, res, next) => {
    (router as any).handle({ ...req, url: `/api${req.url}` }, res, next);
  });
  return router;
}


