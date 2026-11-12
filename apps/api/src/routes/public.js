import { Router } from 'express';
import { getPool } from '../db.js';
import { verifyChain } from '../services/ledger.js';
import { buildCommunitySummary } from '../services/summary.js';
import { communityEvents, channelFor } from '../services/events.js';
import { hashToken } from '../auth/session.js';

export const publicRouter = Router();

/** Rate limit sederhana per IP+token (FR-06 AC: 429 setelah 20 permintaan/menit). */
const buckets = new Map();
const WINDOW_MS = 60_000;
const LIMIT = 20;

function rateLimited(key) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    buckets.set(key, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

async function resolveToken(rawToken) {
  if (typeof rawToken !== 'string' || rawToken.length < 20) return null;

  const [rows] = await getPool().query(
    `SELECT id, community_id, member_id, scope
       FROM public_tokens
      WHERE token_hash = ?
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())
      LIMIT 1`,
    [hashToken(rawToken)],
  );

  return rows[0] ?? null;
}

publicRouter.get('/:token', async (req, res, next) => {
  try {
    if (rateLimited(`${req.ip}:${req.params.token}`)) {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }

    const token = await resolveToken(req.params.token);
    if (!token) return res.status(410).json({ error: 'TOKEN_INVALID_OR_REVOKED' });

    const isPersonal = token.scope === 'MEMBER' && token.member_id !== null;
    const memberId = isPersonal ? Number(token.member_id) : null;

    // Tautan pribadi hanya menarik mutasi anggota itu; angka komunitas tetap agregat.
    const summary = await buildCommunitySummary(Number(token.community_id), { memberId });
    if (!summary) return res.status(404).json({ error: 'COMMUNITY_NOT_FOUND' });

    const member = isPersonal
      ? summary.members.find((item) => item.id === memberId)
      : null;

    return res.json({
      community: summary.community,
      totals: summary.totals,
      packages: summary.packages,
      recentEntries: summary.recentEntries,
      // Nomor telepon & status sengaja tidak ikut: portal publik hanya nama, RT, nominal.
      memberView: member
        ? {
            id: member.id,
            name: member.name,
            rt: member.rt,
            total: member.total,
            arrears: member.arrears,
            arrearsAmount: member.arrearsAmount,
            arrearsDetail: member.arrearsDetail,
          }
        : null,
      scope: isPersonal ? 'MEMBER' : 'COMMUNITY',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

/** SSE: pembaruan real-time tanpa login (FR-07). */
publicRouter.get('/:token/stream', async (req, res, next) => {
  try {
    const token = await resolveToken(req.params.token);
    if (!token) return res.status(410).json({ error: 'TOKEN_INVALID_OR_REVOKED' });

    const communityId = Number(token.community_id);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 5000\n\n');
    res.write(`event: ready\ndata: ${JSON.stringify({ communityId })}\n\n`);

    const listener = (payload) => {
      res.write(`event: update\ndata: ${JSON.stringify(payload)}\n\n`);
    };
    communityEvents.on(channelFor(communityId), listener);

    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      communityEvents.off(channelFor(communityId), listener);
    });

    return undefined;
  } catch (error) {
    return next(error);
  }
});

publicRouter.get('/:token/verify', async (req, res, next) => {
  try {
    const token = await resolveToken(req.params.token);
    if (!token) return res.status(410).json({ error: 'TOKEN_INVALID_OR_REVOKED' });
    return res.json(await verifyChain(Number(token.community_id)));
  } catch (error) {
    return next(error);
  }
});
