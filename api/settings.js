// POST /api/settings  { enabled, start, end }  (관리자 전용)
// start / end 는 epoch ms 숫자 또는 null(빈 문자열)
import { db, isAdmin, readBody, ensureSchema } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });

  const sql = db();
  try {
    await ensureSchema(sql);
    const b = await readBody(req);
    const enabled = b.enabled ? '1' : '0';
    const start = (b.start != null && b.start !== '') ? String(Number(b.start)) : '';
    const end = (b.end != null && b.end !== '') ? String(Number(b.end)) : '';
    for (const [k, v] of [['enabled', enabled], ['start_ms', start], ['end_ms', end]]) {
      await sql`INSERT INTO settings (key, value) VALUES (${k}, ${v})
                ON CONFLICT (key) DO UPDATE SET value = ${v}`;
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
