import { Router } from 'express';
import { searchCache } from '../../../core/cache/Model/lru';

export function createHealthRouter(sources: Array<{ name: string }>) {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'lookmatch-api', sources: sources.map(s => ({ name: s.name, enabled: true })), cache: searchCache.getStats() });
  });
  return router;
}


